import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import {
  clearLastConversation,
  isEmbeddedHost,
  readLastConversation,
  writeLastConversation,
} from "../lib/embed-conversation-storage";
import { getPublicConversationMessages } from "../services/public-conversation-messages";
import { getPublicConversationDetail } from "../services/public-conversations";

const OPERATOR_SYNC_INTERVAL_MS = 4000;
const RESUME_PAGE_SIZE = 1;

function getSequence(message: UIMessage): number {
  const sequence = (message.metadata as { sequence?: number } | undefined)?.sequence;
  return typeof sequence === "number" ? sequence : 0;
}

export function mergeAppendOnlyMessages(previous: UIMessage[], incoming: UIMessage[]): UIMessage[] {
  const map = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) {
    if (!map.has(message.id)) {
      map.set(message.id, message);
    }
  }
  return [...map.values()].sort((a, b) => getSequence(a) - getSequence(b));
}

export function usePublicOperatorMessageSync(options: {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  conversationId: string | undefined;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  status: string;
  enabled?: boolean;
}): void {
  const {
    agentId,
    accessToken,
    anonymousIdentifier,
    conversationId,
    setMessages,
    status,
    enabled = true,
  } = options;

  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!enabled || !conversationId || !agentId || !accessToken) return;

    const poll = () => {
      if (statusRef.current === "streaming" || statusRef.current === "submitted") return;

      void getPublicConversationMessages({
        agentId,
        accessToken,
        anonymousIdentifier,
        conversationId,
        page: 1,
        pageSize: 50,
      })
        .then((result) => {
          setMessages((prev) => mergeAppendOnlyMessages(prev, result.items));
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(poll, OPERATOR_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [agentId, accessToken, anonymousIdentifier, conversationId, enabled, setMessages]);
}

export function useEmbedConversationResume(options: {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  conversationIdFromUrl: string | undefined;
  navigate: NavigateFunction;
  enabled?: boolean;
}): { isResuming: boolean } {
  const {
    agentId,
    accessToken,
    anonymousIdentifier,
    conversationIdFromUrl,
    navigate,
    enabled = true,
  } = options;

  const [isResuming, setIsResuming] = useState(false);
  const resumeAttemptedRef = useRef(false);

  useEffect(() => {
    resumeAttemptedRef.current = false;
  }, [agentId]);

  useEffect(() => {
    if (!enabled || !agentId || !accessToken) return;

    if (conversationIdFromUrl) {
      writeLastConversation(agentId, conversationIdFromUrl);
      setIsResuming(false);
      return;
    }

    if (!isEmbeddedHost()) {
      setIsResuming(false);
      return;
    }

    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;

    const cached = readLastConversation(agentId);
    if (!cached?.conversationId) {
      setIsResuming(false);
      return;
    }

    setIsResuming(true);
    let cancelled = false;

    // Skip resuming archived conversations: clear the cached reference and
    // stay on the first-run screen instead.
    void getPublicConversationDetail({
      accessToken,
      anonymousIdentifier,
      conversationId: cached.conversationId,
    })
      .then((detail) => {
        if (cancelled) return;
        if (detail?.archivedAt) {
          clearLastConversation(agentId);
          setIsResuming(false);
          return;
        }
        return getPublicConversationMessages({
          agentId,
          accessToken,
          anonymousIdentifier,
          conversationId: cached.conversationId,
          page: 1,
          pageSize: RESUME_PAGE_SIZE,
        })
          .then(() => {
            if (cancelled) return;
            navigate(
              `/agents/${agentId}/${encodeURIComponent(accessToken)}/c/${cached.conversationId}`,
              {
                replace: true,
              },
            );
          })
          .catch(() => {
            if (cancelled) return;
            clearLastConversation(agentId);
          });
      })
      .catch(() => {
        if (cancelled) return;
        clearLastConversation(agentId);
      })
      .finally(() => {
        if (!cancelled) {
          setIsResuming(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentId, accessToken, anonymousIdentifier, conversationIdFromUrl, enabled, navigate]);

  return { isResuming };
}
