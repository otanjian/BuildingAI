import { Chat, useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { validate as isUUID } from "uuid";

import { getApiBaseUrl } from "@/utils/api";

import {
  isBackgroundStreamGenerating,
  registerBackgroundStream,
  unregisterBackgroundStream,
} from "../../_shared/background-streams";
import {
  canStartLiveStream,
  getConversationChatRegistry,
  type ConversationChatRegistry,
} from "../../_shared/conversation-chat-registry";
import { subscribeOpencodeSessionEvents } from "../../_shared/opencode-events";
import { buildOpencodeLivePreview } from "../../_shared/opencode-live-preview";
import { shouldRehydrateOpencodeLive } from "../../_shared/opencode-live-rehydrate";
import { getPublicConversationMessages } from "../services/public-conversation-messages";
import {
  getOpencodeSessionMessages,
  stopPublicConversation,
} from "../services/public-conversations";

const STOP_FINALIZE_DELAY_MS = 350;
const USAGE_HYDRATE_RETRY_INTERVAL_MS = 1000;
const USAGE_HYDRATE_MAX_ATTEMPTS = 10;
const USAGE_HYDRATE_PAGE_SIZE = 2;
const OPENCODE_LIVE_POLL_MS = 2500;

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
  /** True when the server reports the mapped OpenCode turn is still running. */
  isOpencodeTurnRunning?: boolean;
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
    isOpencodeTurnRunning = false,
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

  const newConversationCounterRef = useRef(0);
  const [sessionKey, setSessionKey] = useState<string>(
    normalizedInitialConversationId ?? "new-0",
  );

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

  const resolveMessageDbId = useCallback(
    (messageId: string | null | undefined): string | undefined => {
      if (!messageId) return undefined;
      return (
        messageDbIdMapRef.current.get(messageId) ?? (isUUID(messageId) ? messageId : undefined)
      );
    },
    [],
  );

  const mapLatestMessageId = useCallback((role: UIMessage["role"], dbId: string): boolean => {
    const latest = [...messagesRef.current].reverse().find((message) => message.role === role);
    if (!latest) return false;

    messageDbIdMapRef.current.set(latest.id, dbId);
    return true;
  }, []);

  /**
   * Mutable ownership key so provisional `new-N` Chats keep sending the correct
   * conversationId after `registry.rekey` without recreating the Chat/transport.
   */
  const buildTransport = useCallback(
    (ownershipKeyRef: { current: string }) =>
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
          const boundId = isUUID(ownershipKeyRef.current) ? ownershipKeyRef.current : undefined;
          return {
            conversationId: boundId,
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
    [accessToken, anonymousIdentifier, saveConversation],
  );

  const registryScopeKey = `public-agent-${agentId}-${accessToken ?? anonymousIdentifier ?? "anon"}`;
  const registry = useMemo(
    () =>
      getConversationChatRegistry(registryScopeKey) as ConversationChatRegistry<Chat<UIMessage>>,
    [registryScopeKey],
  );

  // Latest helpers for Chat callbacks created once per registry entry.
  const hookApiRef = useRef({
    navigate,
    queryClient,
    agentId,
    accessToken,
    conversationsQueryKey,
    shouldNavigateRef,
    finalizeConversationSideEffects: (_token?: string) => {},
    refetchActiveConversationMessages: async (_id: string | undefined) => {},
    hydrateLastAssistantUsageFromServer: async () => {},
    mapLatestMessageId: (_role: UIMessage["role"], _dbId: string) => false,
    setConversationIdState,
    setStatusOverride,
    conversationIdRef,
    lastAssistantDbIdRef,
    activeConversationIdRef,
    sendTargetConversationIdRef,
    pendingUserDbIdRef,
    pendingAssistantDbIdRef,
    registry,
    setSessionKey,
  });

  const createChatForKey = useCallback(
    (key: string): Chat<UIMessage> => {
      const ownershipKeyRef = { current: key };

      return new Chat({
        id: `public-agent-chat-${agentId}-${key}`,
        transport: buildTransport(ownershipKeyRef),
        sendAutomaticallyWhen: ({ messages: currentMessages }) => {
          const lastMessage = currentMessages.at(-1);
          return (
            lastMessage?.parts?.some(
              (part) =>
                "state" in part &&
                part.state === "approval-responded" &&
                "approval" in part &&
                (part.approval as { approved?: boolean })?.approved === true,
            ) ?? false
          );
        },
        onData: (data) => {
          const api = hookApiRef.current;
          if (data.type === "data-stream-complete" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            api.registry.setStatus(id, "completed");
            unregisterBackgroundStream(id);
            api.finalizeConversationSideEffects();
            if (id === api.activeConversationIdRef.current) {
              void api.refetchActiveConversationMessages(id);
              void api.hydrateLastAssistantUsageFromServer();
            }
            return;
          }

          if (data.type === "data-conversation-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            const activeId = api.activeConversationIdRef.current;
            const isActiveStream =
              (activeId !== undefined && activeId === id) ||
              (activeId === undefined && api.sendTargetConversationIdRef.current === null) ||
              key === id ||
              (!isUUID(key) && api.sendTargetConversationIdRef.current === null);

            registerBackgroundStream(id);
            ownershipKeyRef.current = id;
            if (!isUUID(key) && key !== id) {
              api.registry.rekey(key, id);
            }
            api.registry.setStatus(id, "streaming");

            if (!isActiveStream) return;

            if (activeId === undefined) {
              api.activeConversationIdRef.current = id;
            }
            const wasEmpty = !api.conversationIdRef.current;
            api.conversationIdRef.current = id;
            api.setConversationIdState(id);
            api.setSessionKey(id);
            if (wasEmpty && api.shouldNavigateRef.current) {
              api.navigate(`/agents/${api.agentId}/${api.accessToken}/c/${id}`, { replace: true });
              api.queryClient.invalidateQueries({ queryKey: api.conversationsQueryKey });
            }
            return;
          }

          if (data.type === "data-user-message-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            const ownedId = isUUID(ownershipKeyRef.current)
              ? ownershipKeyRef.current
              : api.conversationIdRef.current;
            if (ownedId !== api.activeConversationIdRef.current) return;
            api.pendingUserDbIdRef.current = id;
            if (api.mapLatestMessageId("user", id)) {
              api.pendingUserDbIdRef.current = null;
            }
          }
          if (data.type === "data-assistant-message-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            const ownedId = isUUID(ownershipKeyRef.current)
              ? ownershipKeyRef.current
              : api.conversationIdRef.current;
            if (ownedId !== api.activeConversationIdRef.current) return;
            api.lastAssistantDbIdRef.current = id;
            api.pendingAssistantDbIdRef.current = id;
            if (api.mapLatestMessageId("assistant", id)) {
              api.pendingAssistantDbIdRef.current = null;
            }
          }
        },
        onFinish: () => {
          const api = hookApiRef.current;
          const ownedId = isUUID(ownershipKeyRef.current)
            ? ownershipKeyRef.current
            : api.conversationIdRef.current && isUUID(api.conversationIdRef.current)
              ? api.conversationIdRef.current
              : key;
          api.registry.setStatus(ownedId, "completed");
          unregisterBackgroundStream(isUUID(ownedId) ? ownedId : undefined);
          if (ownedId === api.activeConversationIdRef.current) {
            api.finalizeConversationSideEffects();
            void api.hydrateLastAssistantUsageFromServer();
          }
        },
        onError: (error) => {
          const api = hookApiRef.current;
          const ownedId = isUUID(ownershipKeyRef.current)
            ? ownershipKeyRef.current
            : api.conversationIdRef.current && isUUID(api.conversationIdRef.current)
              ? api.conversationIdRef.current
              : key;
          api.registry.setStatus(ownedId, "error");
          unregisterBackgroundStream(isUUID(ownedId) ? ownedId : undefined);

          const isActiveError = ownedId === api.activeConversationIdRef.current;
          if (!isActiveError) {
            console.warn("Background agent chat stream error:", error);
            return;
          }

          console.error("Public agent chat stream error:", error);
          const message = (error as Error | undefined)?.message || "Unknown error";
          api.setStatusOverride("error");
          const chat = api.registry.get(ownedId) ?? api.registry.get(key);
          if (!chat) return;
          const prev = chat.messages;
          if (prev.length === 0) {
            chat.messages = [
              {
                id: crypto.randomUUID(),
                role: "assistant",
                parts: [{ type: "data-error", data: message }],
              },
            ];
            return;
          }
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const lastMessage = updated[lastIndex];
          if (lastMessage && lastMessage.role === "assistant") {
            updated[lastIndex] = {
              ...lastMessage,
              parts: [...(lastMessage.parts || []), { type: "data-error", data: message }],
            };
          } else {
            updated.push({
              id: crypto.randomUUID(),
              role: "assistant",
              parts: [{ type: "data-error", data: message }],
            });
          }
          chat.messages = updated;
        },
      });
    },
    [agentId, buildTransport],
  );

  const [activeChat, setActiveChat] = useState<Chat<UIMessage>>(() =>
    registry.getOrCreate(sessionKey, () => createChatForKey(sessionKey)),
  );

  // Rebind during render on conversation change so live registry messages are
  // visible on the first paint after switch (see detail stream hook).
  if (normalizedInitialConversationId !== prevInitialConversationIdRef.current) {
    const nextConversationId = normalizedInitialConversationId;
    const prevConversationId = prevInitialConversationIdRef.current;
    prevInitialConversationIdRef.current = nextConversationId;

    const isEchoNavigation =
      nextConversationId && nextConversationId === conversationIdRef.current;

    if (isEchoNavigation) {
      activeConversationIdRef.current = nextConversationId;
      registry.setActive(nextConversationId);
      const existing = registry.get(nextConversationId);
      if (existing && existing !== activeChat) {
        setActiveChat(existing);
        setSessionKey(nextConversationId);
      }
    } else if (prevConversationId !== nextConversationId) {
      activeConversationIdRef.current = nextConversationId;
      conversationIdRef.current = nextConversationId;
      setConversationIdState(nextConversationId);
      sendTargetConversationIdRef.current = nextConversationId ?? undefined;
      setStatusOverride(null);

      let nextKey: string;
      if (nextConversationId) {
        nextKey = nextConversationId;
      } else {
        newConversationCounterRef.current += 1;
        nextKey = `new-${newConversationCounterRef.current}`;
      }

      registry.setActive(nextConversationId ?? nextKey);
      const chat = registry.getOrCreate(nextKey, () => createChatForKey(nextKey));
      setSessionKey(nextKey);
      setActiveChat(chat);

      lastAssistantDbIdRef.current = null;
      pendingParentIdRef.current = null;
    }
  }

  useEffect(() => {
    registry.setActive(normalizedInitialConversationId ?? sessionKey);
  }, [registry, normalizedInitialConversationId, sessionKey]);

  const {
    messages,
    setMessages: setChatMessages,
    sendMessage,
    stop,
    status,
    regenerate,
    addToolApprovalResponse,
  } = useChat({ chat: activeChat });

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

      setChatMessages((prev) =>
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
  }, [accessToken, agentId, anonymousIdentifier, scheduleTimeout, setChatMessages]);

  const refetchActiveConversationMessages = useCallback(
    async (conversationId: string | undefined): Promise<void> => {
      if (!conversationId || !isUUID(conversationId)) return;
      if (activeConversationIdRef.current !== conversationId) return;
      // Prefer live registry stream over history overwrite while still generating.
      if (registry.isStreaming(conversationId)) return;

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
        if (registry.isStreaming(conversationId)) return;
        setChatMessages(res.items);
      } catch (error) {
        console.warn("Failed to refetch public agent conversation messages after finish", error);
      }
    },
    [accessToken, agentId, anonymousIdentifier, setChatMessages, registry],
  );

  // Keep Chat factory callbacks on the latest closures.
  hookApiRef.current = {
    navigate,
    queryClient,
    agentId,
    accessToken,
    conversationsQueryKey,
    shouldNavigateRef,
    finalizeConversationSideEffects,
    refetchActiveConversationMessages,
    hydrateLastAssistantUsageFromServer,
    mapLatestMessageId,
    setConversationIdState,
    setStatusOverride,
    conversationIdRef,
    lastAssistantDbIdRef,
    activeConversationIdRef,
    sendTargetConversationIdRef,
    pendingUserDbIdRef,
    pendingAssistantDbIdRef,
    registry,
    setSessionKey,
  };

  const beginStreamForActiveConversation = useCallback((): boolean => {
    registry.evictCompletedIdle();
    const targetConversationId = conversationIdRef.current;
    const alreadyStreaming = Boolean(
      targetConversationId && registry.isStreaming(targetConversationId),
    );
    const decision = canStartLiveStream({
      streamingCount: registry.countStreaming(),
      conversationAlreadyStreaming: alreadyStreaming,
    });
    if (!decision.allowed) {
      toast.error(decision.reason);
      return false;
    }
    const statusKey =
      targetConversationId && isUUID(targetConversationId) ? targetConversationId : sessionKey;
    registry.setStatus(statusKey, "streaming");
    if (targetConversationId && isUUID(targetConversationId)) {
      registerBackgroundStream(targetConversationId);
    }
    return true;
  }, [registry, sessionKey]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (status === "streaming") return;
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
      if (!beginStreamForActiveConversation()) return;

      regenerate({
        messageId: msg.id,
        body: { trigger: "regenerate-message" },
      });
    },
    [messages, regenerate, resolveMessageDbId, status, beginStreamForActiveConversation],
  );

  const sendOnActiveRegistryChat = useCallback(
    (args: {
      text: string;
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>;
    }) => {
      const targetConversationId = conversationIdRef.current;
      const key =
        targetConversationId && isUUID(targetConversationId) ? targetConversationId : sessionKey;
      const chat = registry.getOrCreate(key, () => createChatForKey(key));
      if (chat !== activeChat) {
        setActiveChat(chat);
      }

      const fileParts: FileUIPart[] | undefined =
        args.files && args.files.length > 0
          ? args.files.map((file) => ({
              type: "file" as const,
              url: file.url,
              mediaType: file.mediaType || "application/octet-stream",
              ...(file.filename ? { filename: file.filename } : {}),
            }))
          : undefined;

      void chat.sendMessage({
        text: args.text || "",
        ...(fileParts && { files: fileParts }),
      });
    },
    [conversationIdRef, sessionKey, registry, createChatForKey, activeChat],
  );

  const send = useCallback(
    (
      content: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const text = content.trim();
      if (status === "streaming" || status === "submitted") return;
      if (!text && (!files || files.length === 0)) return;
      setStatusOverride(null);
      pendingParentIdRef.current = lastAssistantDbIdRef.current ?? null;

      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (!beginStreamForActiveConversation()) return;

      sendOnActiveRegistryChat({ text, files });
    },
    [status, beginStreamForActiveConversation, sendOnActiveRegistryChat],
  );

  const sendWithParent = useCallback(
    (
      content: string,
      parentIdClientOrDb: string | null | undefined,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const text = content.trim();
      if (status === "streaming" || status === "submitted") return;
      if (!text && (!files || files.length === 0)) return;
      setStatusOverride(null);

      const resolvedParentId = parentIdClientOrDb
        ? (resolveMessageDbId(parentIdClientOrDb) ?? null)
        : null;
      pendingParentIdRef.current = resolvedParentId;

      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (!beginStreamForActiveConversation()) return;

      sendOnActiveRegistryChat({ text, files });
    },
    [status, resolveMessageDbId, beginStreamForActiveConversation, sendOnActiveRegistryChat],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0 ? messages[messages.length - 1]?.id : null;

  useEffect(() => {
    if (messages.length === 0) {
      setStatusOverride(null);
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0) {
      messageDbIdMapRef.current.clear();
      autoApprovedWeatherApprovalIdsRef.current.clear();
      pendingUserDbIdRef.current = null;
      pendingAssistantDbIdRef.current = null;
      lastAssistantDbIdRef.current = null;
      return;
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    lastAssistantDbIdRef.current = lastAssistant?.id ?? null;

    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }: { message: UIMessage }) => message.role === "user")?.index;
    if (lastUserIndex !== undefined && pendingUserDbIdRef.current) {
      messageDbIdMapRef.current.set(messages[lastUserIndex].id, pendingUserDbIdRef.current);
      pendingUserDbIdRef.current = null;
    }

    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && pendingAssistantDbIdRef.current) {
      messageDbIdMapRef.current.set(last.id, pendingAssistantDbIdRef.current);
      pendingAssistantDbIdRef.current = null;
    }
  }, [messages]);

  /**
   * Prefer OpenCode SSE for live progress while the focused conversation has a
   * detached turn running and no live registry Chat stream. Falls back to polling.
   */
  useEffect(() => {
    const conversationId = activeConversationIdRef.current;
    if (!conversationId) return;
    const hasStreamingRegistryChat = registry.isStreaming(conversationId);
    if (
      hasStreamingRegistryChat &&
      status !== "streaming" &&
      status !== "submitted"
    ) {
      registry.setStatus(conversationId, "completed");
    }
    if (
      !shouldRehydrateOpencodeLive({
        isOpencodeTurnRunning:
          isOpencodeTurnRunning || isBackgroundStreamGenerating(conversationId),
        hasStreamingRegistryChat: registry.isStreaming(conversationId),
        chatStatus: status,
      })
    ) {
      return;
    }
    // If the current Chat instance already has a live stream for this
    // conversation, let the normal SSE drive the UI.
    if (status === "streaming" || status === "submitted") return;

    let disposed = false;
    let sseAbortController: AbortController | undefined;

    const applyPreview = (
      ocMessages: import("../../_shared/opencode-live-preview").OpencodeSessionMessage[],
    ) => {
      if (disposed) return;
      if (activeConversationIdRef.current !== conversationId) return;
      setChatMessages((prev) => {
        const lastUser = [...prev].reverse().find((m) => m.role === "user");
        if (!lastUser) return prev;

        const preview = buildOpencodeLivePreview(lastUser.id, ocMessages);
        if (!preview) return prev;

        const withoutPreview = prev.filter((m) => !m.metadata?.isOpencodeLivePreview);
        return [...withoutPreview, preview];
      });
    };

    const poll = async () => {
      if (disposed) return;
      if (activeConversationIdRef.current !== conversationId) return;
      if (!isBackgroundStreamGenerating(conversationId) && !isOpencodeTurnRunning) return;

      try {
        const { messages: ocMessages } = await getOpencodeSessionMessages({
          agentId,
          accessToken,
          anonymousIdentifier,
          conversationId,
        });
        applyPreview(ocMessages);
      } catch (error) {
        console.warn("Failed to poll OpenCode session messages", error);
      }
    };

    const startPolling = () => {
      const id = window.setInterval(poll, OPENCODE_LIVE_POLL_MS);
      poll();
      return () => window.clearInterval(id);
    };

    if (accessToken) {
      sseAbortController = new AbortController();
      const MIN_SSE_PREVIEW_MS = 500;
      let pollingCleanup: (() => void) | undefined;

      const sseStart = Date.now();
      void subscribeOpencodeSessionEvents({
        url: `${getApiBaseUrl()}/v1/conversations/${conversationId}/opencode-session/events`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(anonymousIdentifier ? { "X-Anonymous-Identifier": anonymousIdentifier } : {}),
        },
        signal: sseAbortController.signal,
        onSnapshot: applyPreview,
        onDone: () => {
          unregisterBackgroundStream(conversationId);
          registry.setStatus(conversationId, "completed");
          void refetchActiveConversationMessages(conversationId);
          finalizeConversationSideEffects();
        },
        onError: (error) => {
          console.warn("OpenCode session events failed, falling back to polling", error);
          if (disposed) return;
          if (!pollingCleanup && Date.now() - sseStart >= MIN_SSE_PREVIEW_MS) {
            pollingCleanup = startPolling();
          }
        },
      });

      const pollingGuard = window.setTimeout(() => {
        if (!disposed && !pollingCleanup) {
          pollingCleanup = startPolling();
        }
      }, MIN_SSE_PREVIEW_MS);

      return () => {
        disposed = true;
        sseAbortController?.abort();
        window.clearTimeout(pollingGuard);
        pollingCleanup?.();
      };
    }

    const cleanupPolling = startPolling();

    return () => {
      disposed = true;
      sseAbortController?.abort();
      cleanupPolling?.();
    };
  }, [
    normalizedInitialConversationId,
    status,
    agentId,
    accessToken,
    anonymousIdentifier,
    setChatMessages,
    isOpencodeTurnRunning,
    refetchActiveConversationMessages,
    finalizeConversationSideEffects,
    registry,
  ]);

  const getDbMessageId = useCallback(
    (clientMessageId: string): string | undefined => resolveMessageDbId(clientMessageId),
    [resolveMessageDbId],
  );

  const stopWithFinalize = useCallback(() => {
    const conversationId =
      (conversationIdRef.current && isUUID(conversationIdRef.current)
        ? conversationIdRef.current
        : undefined) ?? (isUUID(sessionKey) ? sessionKey : undefined);
    const targetAssistantId = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "assistant")?.id;
    const finalizeToken =
      conversationId && targetAssistantId ? `${conversationId}:${targetAssistantId}` : undefined;

    if (conversationId && accessToken) {
      void stopPublicConversation({
        conversationId,
        accessToken,
        anonymousIdentifier,
      }).catch((error) => {
        console.warn("Failed to stop OpenCode conversation turn", error);
      });
    }
    stop();
    if (conversationId) {
      registry.setStatus(conversationId, "completed");
    }
    unregisterBackgroundStream(conversationId);

    scheduleTimeout(() => {
      finalizeConversationSideEffects(finalizeToken);
      void hydrateLastAssistantUsageFromServer();
    }, STOP_FINALIZE_DELAY_MS);
  }, [
    stop,
    scheduleTimeout,
    finalizeConversationSideEffects,
    hydrateLastAssistantUsageFromServer,
    sessionKey,
    accessToken,
    anonymousIdentifier,
    registry,
  ]);

  return {
    conversationId: conversationIdState ?? conversationIdRef.current,
    messages,
    status: statusOverride ?? status,
    streamingMessageId,
    setMessages: setChatMessages,
    send,
    sendWithParent,
    stop: stopWithFinalize,
    addToolApprovalResponse,
    regenerate: handleRegenerate,
    getDbMessageId,
  };
}
