import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validate as isUUID } from "uuid";

import { getApiBaseUrl } from "@/utils/api";

import {
  registerBackgroundStream,
  unregisterBackgroundStream,
} from "../../_shared/background-streams";
import { getPublicConversationMessages } from "../services/public-conversation-messages";

const STOP_FINALIZE_DELAY_MS = 350;
const USAGE_HYDRATE_RETRY_INTERVAL_MS = 1000;
const USAGE_HYDRATE_MAX_ATTEMPTS = 10;
const USAGE_HYDRATE_PAGE_SIZE = 2;

function getPendingWeatherApprovalIds(messages: UIMessage[]): string[] {
  return messages.flatMap((message) =>
    (message.parts ?? []).flatMap((part) => {
      const toolPart = part as {
        type?: string;
        state?: string;
        approval?: { id?: string; approved?: boolean };
      };
      const approvalId = toolPart.approval?.id;
      if (
        toolPart.type !== "tool-getWeather" ||
        toolPart.state !== "approval-requested" ||
        !approvalId ||
        toolPart.approval?.approved !== undefined
      ) {
        return [];
      }
      return [approvalId];
    }),
  );
}

export interface UsePublicAgentChatStreamOptions {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  initialConversationId?: string;
  saveConversation?: boolean;
  formVariables?: Record<string, string> | undefined;
  formFieldsInputs?: Record<string, unknown> | undefined;
}

export interface UsePublicAgentChatStreamReturn {
  conversationId: string | undefined;
  messages: UIMessage[];
  status: ChatStatus;
  streamingMessageId: string | null;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  send: (
    content: string,
    files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
  ) => void;
  sendWithParent: (
    content: string,
    parentIdClientOrDb: string | null | undefined,
    files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
  ) => void;
  stop: () => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
  regenerate: (messageId: string) => void;
  getDbMessageId: (clientMessageId: string) => string | undefined;
}

export function usePublicAgentChatStream(
  options: UsePublicAgentChatStreamOptions,
): UsePublicAgentChatStreamReturn {
  const {
    agentId,
    accessToken,
    anonymousIdentifier,
    initialConversationId,
    saveConversation = true,
    formVariables,
    formFieldsInputs,
  } = options;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const finalizedTokenRef = useRef<string | null>(null);
  const messagesRef = useRef<UIMessage[]>([]);
  const autoApprovedWeatherApprovalIdsRef = useRef<Set<string>>(new Set());

  const normalizedInitialConversationId =
    initialConversationId && isUUID(initialConversationId) ? initialConversationId : undefined;

  const conversationIdRef = useRef<string | undefined>(normalizedInitialConversationId);
  const [conversationIdState, setConversationIdState] = useState<string | undefined>(
    normalizedInitialConversationId,
  );
  const prevInitialConversationIdRef = useRef<string | undefined>(normalizedInitialConversationId);

  /**
   * The conversation currently visible in the UI. Distinguished from
   * `conversationIdRef` because background (switched-away) streams keep
   * emitting events through the same hook and must not affect the visible
   * conversation.
   */
  const activeConversationIdRef = useRef<string | undefined>(normalizedInitialConversationId);

  /**
   * The conversation this hook intends the next request to target: set right
   * before each `sendMessage` call. Used to accept the server's
   * `data-conversation-id` echo for newly created conversations.
   */
  const sendTargetConversationIdRef = useRef<string | null | undefined>(
    normalizedInitialConversationId,
  );

  /**
   * Conversation id of the visible stream only (set from `data-conversation-id`
   * when that echo belongs to the active conversation). Must not be overwritten
   * by background streams.
   */
  const streamTargetConversationIdRef = useRef<string | undefined>(undefined);

  /**
   * Maps each `chatSessionKey` to the conversation id owned by that Chat
   * instance's in-flight stream. Background `onFinish`/`onError` callbacks
   * close over their session key and unregister via this map so concurrent
   * streams cannot clear each other's generating badge.
   */
  const streamOwnerBySessionRef = useRef(new Map<string, string>());
  const pendingUsageHydrateConversationIdRef = useRef<string | undefined>(undefined);

  /**
   * Key passed to `useChat({ id })`. Changes only when the user explicitly
   * switches conversations, so the AI SDK recreates the Chat instance and the
   * previous instance's in-flight request keeps running in the background.
   */
  const [chatSessionKey, setChatSessionKey] = useState<string>(
    normalizedInitialConversationId ?? "new",
  );
  const newConversationCounterRef = useRef(0);

  const hasInitialConversationId = Boolean(normalizedInitialConversationId);
  const shouldNavigateRef = useRef(!hasInitialConversationId);
  useEffect(() => {
    shouldNavigateRef.current = !hasInitialConversationId;
  }, [hasInitialConversationId]);

  const formVariablesRef = useRef(formVariables);
  const formFieldsInputsRef = useRef(formFieldsInputs);
  useEffect(() => {
    formVariablesRef.current = formVariables;
  }, [formVariables]);
  useEffect(() => {
    formFieldsInputsRef.current = formFieldsInputs;
  }, [formFieldsInputs]);

  const pendingParentIdRef = useRef<string | null>(null);
  const messageDbIdMapRef = useRef<Map<string, string>>(new Map());
  const pendingUserDbIdRef = useRef<string | null>(null);
  const lastAssistantDbIdRef = useRef<string | null>(null);
  const pendingAssistantDbIdRef = useRef<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<ChatStatus | null>(null);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      fn();
    }, ms);
    pendingTimeoutsRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    const timeouts = pendingTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const conversationsQueryKey = useMemo(
    () => ["public-agent-conversations", agentId, accessToken, anonymousIdentifier ?? ""],
    [agentId, accessToken, anonymousIdentifier],
  );

  const finalizeConversationSideEffects = useCallback(
    (token?: string) => {
      if (token) {
        if (finalizedTokenRef.current === token) return;
        finalizedTokenRef.current = token;
      }

      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
    [queryClient, conversationsQueryKey],
  );

  const mapLatestMessageId = useCallback((role: UIMessage["role"], dbId: string): boolean => {
    const latest = [...messagesRef.current].reverse().find((message) => message.role === role);
    if (!latest) return false;

    messageDbIdMapRef.current.set(latest.id, dbId);
    return true;
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getApiBaseUrl()}/v1/chat-messages`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(anonymousIdentifier ? { "X-Anonymous-Identifier": anonymousIdentifier } : {}),
        },
        body: () => {
          const parentId = pendingParentIdRef.current;
          pendingParentIdRef.current = null;
          const fv = formVariablesRef.current;
          const ffi = formFieldsInputsRef.current;
          const currentConversationId = conversationIdRef.current;
          return {
            conversationId:
              currentConversationId && isUUID(currentConversationId)
                ? currentConversationId
                : undefined,
            ...(saveConversation === false && { saveConversation: false }),
            ...(fv && Object.keys(fv).length > 0 && { formVariables: fv }),
            ...(ffi && Object.keys(ffi).length > 0 && { formFieldsInputs: ffi }),
            ...(parentId !== undefined && parentId !== null && { parentId }),
          };
        },
        prepareSendMessagesRequest(request) {
          const lastMessage = request.messages.at(-1);
          const isToolApprovalContinuation = request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return state === "approval-responded" || state === "output-denied";
            }),
          );
          return {
            body: {
              ...request.body,
              ...(isToolApprovalContinuation
                ? { message: lastMessage }
                : { messages: request.messages }),
            },
          };
        },
      }),
    [accessToken, saveConversation, anonymousIdentifier],
  );

  const { messages, setMessages, sendMessage, stop, status, regenerate, addToolApprovalResponse } =
    useChat({
      id: `public-agent-chat-${agentId}-${accessToken}-${anonymousIdentifier ?? ""}-${chatSessionKey}`,
      sendAutomaticallyWhen: ({ messages: currentMessages }) => {
        const lastMessage = currentMessages.at(-1);
        const shouldContinue =
          lastMessage?.parts?.some(
            (part) =>
              "state" in part &&
              part.state === "approval-responded" &&
              "approval" in part &&
              (part.approval as { approved?: boolean })?.approved === true,
          ) ?? false;
        return shouldContinue;
      },
      transport,
      onData: (data) => {
        if (data.type === "data-stream-complete" && data.data) {
          const id = data.data as string;
          if (!isUUID(id)) return;
          // Payload carries conversationId — required because AI SDK useChat
          // routes all Chat instances through one callbacksRef, so onFinish
          // cannot trust chatSessionKey to identify which stream ended.
          for (const [sessionKey, ownedId] of streamOwnerBySessionRef.current) {
            if (ownedId === id) streamOwnerBySessionRef.current.delete(sessionKey);
          }
          unregisterBackgroundStream(id);
          finalizeConversationSideEffects();
          if (id === activeConversationIdRef.current) {
            void refetchActiveConversationMessages(id);
            pendingUsageHydrateConversationIdRef.current = id;
          }
          return;
        }

        if (data.type === "data-conversation-id" && data.data) {
          const id = data.data as string;
          if (!isUUID(id)) return;
          const activeId = activeConversationIdRef.current;

          // Determine whether this echo belongs to the visible conversation:
          // - visible conversation exists and matches the echo id
          // - no visible conversation yet but we just sent a request expecting
          //   a brand-new conversation id
          const isActiveStream =
            (activeId !== undefined && activeId === id) ||
            (activeId === undefined && sendTargetConversationIdRef.current === null);

          registerBackgroundStream(id);

          // Never bind background echoes to the current chatSessionKey — that
          // key belongs to the visible Chat after a switch (callbacksRef shares
          // onData across instances).
          if (!isActiveStream) return;

          streamOwnerBySessionRef.current.set(chatSessionKey, id);
          streamTargetConversationIdRef.current = id;
          if (activeId === undefined) {
            activeConversationIdRef.current = id;
          }
          const wasEmpty = !conversationIdRef.current;
          conversationIdRef.current = id;
          setConversationIdState(id);
          if (shouldNavigateRef.current && wasEmpty) {
            navigate(`/agents/${agentId}/${accessToken}/c/${id}`, { replace: true });
            queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
          }
        }

        if (data.type === "data-assistant-message-id" && data.data) {
          const id = data.data as string;
          if (!isUUID(id)) return;
          if (streamTargetConversationIdRef.current !== activeConversationIdRef.current) return;
          lastAssistantDbIdRef.current = id;
          pendingAssistantDbIdRef.current = id;
          if (mapLatestMessageId("assistant", id)) {
            pendingAssistantDbIdRef.current = null;
          }
        }

        if (data.type === "data-user-message-id" && data.data) {
          const id = data.data as string;
          if (!isUUID(id)) return;
          if (streamTargetConversationIdRef.current !== activeConversationIdRef.current) return;
          pendingUserDbIdRef.current = id;
          if (mapLatestMessageId("user", id)) {
            pendingUserDbIdRef.current = null;
          }
        }
      },
      onFinish: () => {
        // Prefer data-stream-complete for unregister. Fallback only clears the
        // owner bound to this session key when it is still the active chat.
        const ownedId = streamOwnerBySessionRef.current.get(chatSessionKey);
        streamOwnerBySessionRef.current.delete(chatSessionKey);
        if (ownedId && ownedId === activeConversationIdRef.current) {
          unregisterBackgroundStream(ownedId);
          finalizeConversationSideEffects();
        }

        const hydrateId = pendingUsageHydrateConversationIdRef.current;
        if (hydrateId && hydrateId === activeConversationIdRef.current) {
          pendingUsageHydrateConversationIdRef.current = undefined;
          void hydrateLastAssistantUsageFromServer();
        }
      },
      onError: (error) => {
        const ownedId = streamOwnerBySessionRef.current.get(chatSessionKey);
        streamOwnerBySessionRef.current.delete(chatSessionKey);
        const fallbackId =
          ownedId && ownedId === activeConversationIdRef.current
            ? ownedId
            : activeConversationIdRef.current;
        unregisterBackgroundStream(fallbackId);

        const isActiveError =
          fallbackId !== undefined && fallbackId === activeConversationIdRef.current;

        if (!isActiveError) {
          console.warn("Background agent chat stream error:", error);
          return;
        }

        console.error("Public agent chat stream error:", error);
        const message = (error as Error | undefined)?.message || "Unknown error";
        setStatusOverride("error");
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const lastMessage = updated[lastIndex];
          if (lastMessage && lastMessage.role === "assistant") {
            updated[lastIndex] = {
              ...lastMessage,
              parts: [
                ...(lastMessage.parts || []),
                {
                  type: "data-error",
                  data: message,
                },
              ],
            };
            return updated;
          }
          // If the stream fails before an assistant message is created,
          // insert a synthetic assistant error message so the UI can display it.
          updated.push({
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [{ type: "data-error", data: message }],
          });
          return updated;
        });
      },
    });

  messagesRef.current = messages;

  useEffect(() => {
    if (!addToolApprovalResponse) return;

    for (const approvalId of getPendingWeatherApprovalIds(messages)) {
      if (autoApprovedWeatherApprovalIdsRef.current.has(approvalId)) continue;
      autoApprovedWeatherApprovalIdsRef.current.add(approvalId);
      addToolApprovalResponse({ id: approvalId, approved: true });
    }
  }, [messages, addToolApprovalResponse]);

  const hydrateLastAssistantUsageFromServer = useCallback(async (): Promise<void> => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;

    const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const targetClientId = lastAssistant.id;
    const targetDbId = messageDbIdMapRef.current.get(targetClientId);

    const isStillTargetable = (): boolean => {
      if (conversationIdRef.current !== conversationId) return false;
      return messagesRef.current.some((m) => m.id === targetClientId && m.role === "assistant");
    };

    const getUsage = (message: UIMessage) => {
      const msgWithUsage = message as {
        usage?: Record<string, unknown> | null;
        userConsumedPower?: number | null;
      };
      const metadata = message.metadata as
        | { usage?: Record<string, unknown> | null; userConsumedPower?: number | null }
        | undefined;
      return {
        usage: msgWithUsage.usage ?? metadata?.usage ?? undefined,
        userConsumedPower:
          msgWithUsage.userConsumedPower ?? metadata?.userConsumedPower ?? undefined,
      };
    };

    const findMessage = (items: UIMessage[]): UIMessage | undefined => {
      const matched = items.find(
        (message) =>
          (targetDbId != null && message.id === targetDbId) || message.id === targetClientId,
      );
      if (matched) return matched;

      return [...items].reverse().find((message) => {
        const { usage, userConsumedPower } = getUsage(message);
        return message.role === "assistant" && (usage != null || userConsumedPower != null);
      });
    };

    const applyUsage = (source: UIMessage): void => {
      const { usage, userConsumedPower } = getUsage(source);
      if (!usage && userConsumedPower == null) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== targetClientId) return m;
          const nextMetadata: Record<string, unknown> =
            m.metadata && typeof m.metadata === "object"
              ? { ...(m.metadata as Record<string, unknown>) }
              : {};
          if (usage) nextMetadata.usage = usage;
          if (userConsumedPower != null) nextMetadata.userConsumedPower = userConsumedPower;

          const usagePayload = {
            ...(usage ?? {}),
            ...(userConsumedPower != null ? { userConsumedPower } : {}),
          };
          const usagePart = { type: "data-usage" as const, data: usagePayload };
          const nextParts = (Array.isArray(m.parts) ? m.parts : []).filter(
            (part) =>
              !(
                part &&
                typeof part === "object" &&
                (part as { type?: string }).type === "data-usage"
              ),
          );
          nextParts.push(usagePart as (typeof nextParts)[number]);

          return {
            ...m,
            metadata: nextMetadata as UIMessage["metadata"],
            parts: nextParts,
          };
        }),
      );
    };

    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        scheduleTimeout(resolve, ms);
      });

    for (let attempt = 0; attempt < USAGE_HYDRATE_MAX_ATTEMPTS; attempt += 1) {
      if (!isStillTargetable()) return;

      let message: UIMessage | undefined;
      try {
        const res = await getPublicConversationMessages({
          agentId,
          accessToken,
          anonymousIdentifier,
          conversationId,
          page: 1,
          pageSize: USAGE_HYDRATE_PAGE_SIZE,
        });
        message = findMessage(res.items ?? []);
      } catch (error) {
        console.warn("Failed to fetch public agent messages for usage hydration", error);
      }

      if (!isStillTargetable()) return;

      if (message) {
        const { usage, userConsumedPower } = getUsage(message);
        if (usage != null || userConsumedPower != null) {
          applyUsage(message);
          return;
        }
      }

      if (attempt + 1 < USAGE_HYDRATE_MAX_ATTEMPTS) {
        await sleep(USAGE_HYDRATE_RETRY_INTERVAL_MS);
      }
    }
  }, [accessToken, agentId, anonymousIdentifier, scheduleTimeout, setMessages]);

  const refetchActiveConversationMessages = useCallback(
    async (conversationId: string | undefined): Promise<void> => {
      if (!conversationId || !isUUID(conversationId)) return;
      if (activeConversationIdRef.current !== conversationId) return;

      try {
        const res = await getPublicConversationMessages({
          agentId,
          accessToken,
          anonymousIdentifier,
          conversationId,
          page: 1,
          pageSize: 50,
        });
        if (activeConversationIdRef.current !== conversationId) return;
        setMessages(res.items);
      } catch (error) {
        console.warn("Failed to refetch public agent conversation messages after finish", error);
      }
    },
    [accessToken, agentId, anonymousIdentifier, setMessages],
  );

  useEffect(() => {
    const nextConversationId = normalizedInitialConversationId;
    const prevConversationId = prevInitialConversationIdRef.current;

    if (prevConversationId === nextConversationId) return;
    prevInitialConversationIdRef.current = nextConversationId;

    // The URL now matches the conversation our current Chat instance is already
    // bound to (e.g. the `data-conversation-id` echo navigated here right after
    // creating it). Do NOT recreate the instance — its stream is in flight.
    if (nextConversationId && nextConversationId === conversationIdRef.current) {
      activeConversationIdRef.current = nextConversationId;
      return;
    }

    // Explicit switch to another conversation or to a brand-new one: recreate
    // the Chat instance. The previous instance's in-flight request keeps
    // streaming in the background and completes on its own.
    activeConversationIdRef.current = nextConversationId;
    conversationIdRef.current = nextConversationId;
    setConversationIdState(nextConversationId);
    // undefined = no request sent yet, so no `data-conversation-id` echo is
    // expected (a `null` value is reserved for "request sent, awaiting new id"
    // and is only set inside the send paths).
    sendTargetConversationIdRef.current = nextConversationId ?? undefined;

    if (nextConversationId) {
      setChatSessionKey(nextConversationId);
    } else {
      newConversationCounterRef.current += 1;
      setChatSessionKey(`new-${newConversationCounterRef.current}`);
    }

    pendingParentIdRef.current = null;
    lastAssistantDbIdRef.current = null;
  }, [normalizedInitialConversationId, setChatSessionKey]);

  const resolveMessageDbId = useCallback(
    (messageId: string | null | undefined): string | undefined => {
      if (!messageId) return undefined;
      const mapped = messageDbIdMapRef.current.get(messageId);
      if (mapped) return mapped;
      return isUUID(messageId) ? messageId : undefined;
    },
    [],
  );

  const getDbMessageId = useCallback(
    (clientMessageId: string): string | undefined => resolveMessageDbId(clientMessageId),
    [resolveMessageDbId],
  );

  useEffect(() => {
    if (messages.length === 0) {
      setStatusOverride(null);
      messageDbIdMapRef.current.clear();
      pendingUserDbIdRef.current = null;
      pendingAssistantDbIdRef.current = null;
      lastAssistantDbIdRef.current = null;
      return;
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    lastAssistantDbIdRef.current = lastAssistant?.id ?? null;

    const lastUser = [...messages]
      .map((m, index) => ({ m, index }))
      .reverse()
      .find(({ m }) => m.role === "user");

    if (lastUser && pendingUserDbIdRef.current) {
      messageDbIdMapRef.current.set(messages[lastUser.index].id, pendingUserDbIdRef.current);
      pendingUserDbIdRef.current = null;
    }

    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && pendingAssistantDbIdRef.current) {
      messageDbIdMapRef.current.set(last.id, pendingAssistantDbIdRef.current);
      pendingAssistantDbIdRef.current = null;
    }
  }, [messages]);

  const streamingMessageId =
    status === "streaming" && messages.length > 0 ? messages[messages.length - 1]?.id : null;

  const send = useCallback(
    (
      content: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const text = content.trim();
      if (status === "streaming") return;
      if (!text && (!files || files.length === 0)) return;
      setStatusOverride(null);
      pendingParentIdRef.current = lastAssistantDbIdRef.current ?? null;
      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (targetConversationId) {
        streamOwnerBySessionRef.current.set(chatSessionKey, targetConversationId);
        registerBackgroundStream(targetConversationId);
      }

      const fileParts: FileUIPart[] | undefined =
        files && files.length > 0
          ? files.map((file) => ({
              type: "file" as const,
              url: file.url,
              mediaType: file.mediaType || "application/octet-stream",
              ...(file.filename ? { filename: file.filename } : {}),
            }))
          : undefined;

      sendMessage({
        text: text || "",
        ...(fileParts && { files: fileParts }),
      });
    },
    [status, sendMessage, chatSessionKey],
  );

  const sendWithParent = useCallback(
    (
      content: string,
      parentIdClientOrDb: string | null | undefined,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const text = content.trim();
      if (status === "streaming") return;
      if (!text && (!files || files.length === 0)) return;
      setStatusOverride(null);

      const resolvedParentId = parentIdClientOrDb
        ? (resolveMessageDbId(parentIdClientOrDb) ?? null)
        : null;
      pendingParentIdRef.current = resolvedParentId;

      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (targetConversationId) {
        streamOwnerBySessionRef.current.set(chatSessionKey, targetConversationId);
        registerBackgroundStream(targetConversationId);
      }

      const fileParts: FileUIPart[] | undefined =
        files && files.length > 0
          ? files.map((file) => ({
              type: "file" as const,
              url: file.url,
              mediaType: file.mediaType || "application/octet-stream",
              ...(file.filename ? { filename: file.filename } : {}),
            }))
          : undefined;

      sendMessage({
        text: text || "",
        ...(fileParts && { files: fileParts }),
      });
    },
    [status, sendMessage, resolveMessageDbId, chatSessionKey],
  );

  const handleRegenerate = useCallback(
    (messageId: string) => {
      setStatusOverride(null);
      const msgIndex = messages.findIndex(
        (m) => m.id === messageId || resolveMessageDbId(m.id) === messageId,
      );
      if (msgIndex < 0) return;

      const msg = messages[msgIndex];
      if (msg.role === "user") {
        pendingParentIdRef.current = resolveMessageDbId(msg.id) ?? null;
      } else if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = resolveMessageDbId(messages[msgIndex - 1].id) ?? null;
      }

      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (targetConversationId) {
        streamOwnerBySessionRef.current.set(chatSessionKey, targetConversationId);
        registerBackgroundStream(targetConversationId);
      }

      regenerate({
        messageId: msg.id,
        body: { trigger: "regenerate-message" },
      });
    },
    [messages, regenerate, resolveMessageDbId, chatSessionKey],
  );

  const stopWithFinalize = useCallback(() => {
    const conversationId =
      streamOwnerBySessionRef.current.get(chatSessionKey) ?? conversationIdRef.current;
    streamOwnerBySessionRef.current.delete(chatSessionKey);
    const targetAssistantId = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "assistant")?.id;
    const token =
      conversationId && targetAssistantId ? `${conversationId}:${targetAssistantId}` : undefined;

    stop();
    unregisterBackgroundStream(conversationId);

    scheduleTimeout(() => {
      finalizeConversationSideEffects(token);
      void hydrateLastAssistantUsageFromServer();
    }, STOP_FINALIZE_DELAY_MS);
  }, [
    stop,
    scheduleTimeout,
    finalizeConversationSideEffects,
    hydrateLastAssistantUsageFromServer,
    chatSessionKey,
  ]);

  return {
    conversationId: conversationIdState ?? conversationIdRef.current,
    messages,
    status: statusOverride ?? status,
    streamingMessageId,
    setMessages,
    send,
    sendWithParent,
    stop: stopWithFinalize,
    addToolApprovalResponse,
    regenerate: handleRegenerate,
    getDbMessageId,
  };
}
