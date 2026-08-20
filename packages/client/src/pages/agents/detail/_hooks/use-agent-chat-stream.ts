import { Chat, useChat } from "@ai-sdk/react";
import {
  acceptOpencodeTurn,
  type AgentChatMessageItem,
  getOpencodeTurnStatus,
  listAgentConversationMessages,
  stopAgentConversation,
  stopOpencodeTurn,
} from "@buildingai/services/web";
import { getAgentOpencodeSessionMessages } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { shouldRefreshUserPowerAfterUsage } from "@buildingai/ui/lib/remaining-power-label";
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
  type ConversationChatRegistry,
  getConversationChatRegistry,
} from "../../_shared/conversation-chat-registry";
import { subscribeOpencodeSessionEvents } from "../../_shared/opencode-events";
import { buildOpencodeLivePreview } from "../../_shared/opencode-live-preview";
import { shouldRehydrateOpencodeLive } from "../../_shared/opencode-live-rehydrate";
import type { OpencodeTurnActivity } from "../../_shared/opencode-turn-client";
import { useDeterministicOpencodeTurn } from "../../_shared/use-deterministic-opencode-turn";

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

export interface UseAgentChatStreamOptions {
  agentId: string;
  saveConversation?: boolean;
  isDebug?: boolean;
  formVariables?: Record<string, string>;
  formFieldsInputs?: Record<string, unknown>;
  feature?: Record<string, boolean>;
  lastMessageDbIdRef: React.RefObject<string | null>;
  pendingParentIdRef: React.RefObject<string | null>;
  conversationIdRef: React.RefObject<string | undefined>;
  routeConversationId?: string;
  disableAutoNavigate?: boolean;
  /** True when the server reports the mapped OpenCode turn is still running. */
  isOpencodeTurnRunning?: boolean;
  durableOpencodeTurnsEnabled?: boolean;
  activeOpencodeTurn?: Omit<OpencodeTurnActivity, "conversationId"> | null;
}

export interface UseAgentChatStreamReturn {
  conversationId: string | undefined;
  messages: UIMessage[];
  status: ChatStatus;
  streamingMessageId: string | null;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  regenerate: (messageId: string) => void;
  send: (
    content: string,
    parentId?: string | null,
    files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
  ) => void;
  stop: () => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
  getDbMessageId: (clientMessageId: string) => string | undefined;
}

export function useAgentChatStream(options: UseAgentChatStreamOptions): UseAgentChatStreamReturn {
  const {
    agentId,
    saveConversation = true,
    isDebug = false,
    formVariables,
    formFieldsInputs,
    feature,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    routeConversationId,
    disableAutoNavigate = false,
    isOpencodeTurnRunning = false,
    durableOpencodeTurnsEnabled = false,
    activeOpencodeTurn,
  } = options;

  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [conversationIdState, setConversationIdState] = useState<string | undefined>(undefined);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const finalizedTokenRef = useRef<string | null>(null);
  const formVariablesRef = useRef(formVariables);
  const formFieldsInputsRef = useRef(formFieldsInputs);
  const featureRef = useRef<Record<string, boolean> | undefined>(feature);
  const messagesRef = useRef<UIMessage[]>([]);
  const autoApprovedWeatherApprovalIdsRef = useRef<Set<string>>(new Set());
  const messageDbIdMapRef = useRef<Map<string, string>>(new Map());
  const pendingUserDbIdRef = useRef<string | null>(null);
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

  const finalizeConversationSideEffects = useCallback(
    (token?: string) => {
      if (token) {
        if (finalizedTokenRef.current === token) return;
        finalizedTokenRef.current = token;
      }

      queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    },
    [queryClient],
  );

  useEffect(() => {
    formVariablesRef.current = formVariables;
    formFieldsInputsRef.current = formFieldsInputs;
  }, [formVariables, formFieldsInputs]);
  useEffect(() => {
    featureRef.current = feature;
  }, [feature]);

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

  const buildTransport = useCallback(
    (binding: { conversationId?: string }) =>
      new DefaultChatTransport({
        api: `${getApiBaseUrl()}/api/ai-agents/${agentId}/chat/stream`,
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: () => {
          const parentId = pendingParentIdRef.current;
          pendingParentIdRef.current = null;
          const fv = formVariablesRef.current;
          const ffi = formFieldsInputsRef.current;
          const currentFeature = featureRef.current;
          const boundId =
            binding.conversationId && isUUID(binding.conversationId)
              ? binding.conversationId
              : undefined;
          return {
            conversationId: boundId,
            ...(saveConversation === false && { saveConversation: false }),
            ...(isDebug && { isDebug: true }),
            ...(fv && Object.keys(fv).length > 0 && { formVariables: fv }),
            ...(ffi && Object.keys(ffi).length > 0 && { formFieldsInputs: ffi }),
            ...(currentFeature &&
              Object.keys(currentFeature).length > 0 && { feature: currentFeature }),
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
    [agentId, token, saveConversation, isDebug, pendingParentIdRef],
  );

  const normalizedRouteConversationId =
    routeConversationId && isUUID(routeConversationId) ? routeConversationId : undefined;

  /**
   * The conversation currently visible in the UI. Distinguished from the
   * shared `conversationIdRef` because background (switched-away) streams keep
   * emitting events through the same hook and must not affect the visible
   * conversation.
   */
  const activeConversationIdRef = useRef<string | undefined>(normalizedRouteConversationId);

  /**
   * The conversation this hook intends the next request to target: set right
   * before each `sendMessage` call. Used to accept the server's
   * `data-conversation-id` echo for newly created conversations.
   */
  const sendTargetConversationIdRef = useRef<string | null | undefined>(
    normalizedRouteConversationId,
  );

  const registry = useMemo(
    () =>
      getConversationChatRegistry(`detail-agent-${agentId}`) as ConversationChatRegistry<
        Chat<UIMessage>
      >,
    [agentId],
  );

  const newConversationCounterRef = useRef(0);
  const prevRouteConversationIdRef = useRef<string | undefined>(normalizedRouteConversationId);
  const [sessionKey, setSessionKey] = useState<string>(normalizedRouteConversationId ?? "new-0");

  // Latest helpers for Chat callbacks created once per registry entry.
  const hookApiRef = useRef({
    navigate,
    queryClient,
    agentId,
    disableAutoNavigate,
    finalizeConversationSideEffects: (_token?: string) => {},
    refetchActiveConversationMessages: async (_id: string | undefined) => {},
    hydrateLastAssistantUsageFromServer: async () => {},
    mapLatestMessageId: (_role: UIMessage["role"], _dbId: string): boolean => false,
    setConversationIdState,
    setStatusOverride,
    conversationIdRef,
    lastMessageDbIdRef,
    activeConversationIdRef,
    sendTargetConversationIdRef,
    pendingUserDbIdRef,
    pendingAssistantDbIdRef,
    registry,
    setSessionKey,
  });

  const createChatForKey = useCallback(
    (key: string): Chat<UIMessage> => {
      // Mutable binding so provisional `new-*` Chats pick up the real UUID after
      // `data-conversation-id` without recreating transport (registry rekey alone
      // does not update the closed-over transport conversationId).
      const binding: { conversationId?: string } = {
        conversationId: isUUID(key) ? key : undefined,
      };
      return new Chat({
        id: `agent-chat-${agentId}-${key}`,
        transport: buildTransport(binding),
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

          if (data.type === "data-usage" && shouldRefreshUserPowerAfterUsage(data.data)) {
            api.queryClient.invalidateQueries({ queryKey: ["user", "info"] });
          }

          if (data.type === "data-conversation-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            binding.conversationId = id;
            const activeId = api.activeConversationIdRef.current;
            const isActiveStream =
              (activeId !== undefined && activeId === id) ||
              (activeId === undefined && api.sendTargetConversationIdRef.current === null) ||
              key === id ||
              (!isUUID(key) && api.sendTargetConversationIdRef.current === null);

            registerBackgroundStream(id);
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
            if (wasEmpty && !api.disableAutoNavigate) {
              api.navigate(`/agents/${api.agentId}/c/${id}`, { replace: true });
              api.queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
            }
            return;
          }

          if (data.type === "data-user-message-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            const ownedId =
              binding.conversationId ?? (isUUID(key) ? key : api.conversationIdRef.current);
            if (ownedId !== api.activeConversationIdRef.current) return;
            api.lastMessageDbIdRef.current = id;
            api.pendingUserDbIdRef.current = id;
            if (api.mapLatestMessageId("user", id)) {
              api.pendingUserDbIdRef.current = null;
            }
          }
          if (data.type === "data-assistant-message-id" && data.data) {
            const id = data.data as string;
            if (!isUUID(id)) return;
            const ownedId =
              binding.conversationId ?? (isUUID(key) ? key : api.conversationIdRef.current);
            if (ownedId !== api.activeConversationIdRef.current) return;
            api.lastMessageDbIdRef.current = id;
            api.pendingAssistantDbIdRef.current = id;
            if (api.mapLatestMessageId("assistant", id)) {
              api.pendingAssistantDbIdRef.current = null;
            }
          }
        },
        onFinish: () => {
          const api = hookApiRef.current;
          const ownedId =
            binding.conversationId && isUUID(binding.conversationId)
              ? binding.conversationId
              : isUUID(key)
                ? key
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
          const ownedId =
            binding.conversationId && isUUID(binding.conversationId)
              ? binding.conversationId
              : isUUID(key)
                ? key
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

          console.error("Agent chat stream error:", error);
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

  // Rebind the visible Chat during render when the route conversation changes so
  // the first paint after switch already has that conversation's live messages
  // (avoids one frame of the previous Chat + pendingClear dropping the user turn).
  if (normalizedRouteConversationId !== prevRouteConversationIdRef.current) {
    const nextConversationId = normalizedRouteConversationId;
    const prevConversationId = prevRouteConversationIdRef.current;
    prevRouteConversationIdRef.current = nextConversationId;

    const isEchoNavigation = nextConversationId && nextConversationId === conversationIdRef.current;

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

      lastMessageDbIdRef.current = null;
      pendingParentIdRef.current = null;
    }
  }

  useEffect(() => {
    registry.setActive(normalizedRouteConversationId ?? sessionKey);
  }, [registry, normalizedRouteConversationId, sessionKey]);

  const {
    messages,
    setMessages: setChatMessages,
    sendMessage: _sendMessage,
    stop,
    status,
    regenerate: _regenerate,
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

    const getUsage = (record: AgentChatMessageItem) => {
      const message = record.message as {
        id?: string;
        role?: string;
        usage?: Record<string, unknown> | null;
        userConsumedPower?: number | null;
      };
      return {
        message,
        usage: message.usage ?? undefined,
        userConsumedPower: message.userConsumedPower ?? undefined,
      };
    };

    const findRecord = (items: AgentChatMessageItem[]): AgentChatMessageItem | undefined => {
      const matched = items.find((record) => {
        const message = record.message as { id?: string };
        return (targetDbId != null && record.id === targetDbId) || message.id === targetClientId;
      });
      if (matched) return matched;

      return items.find((record) => {
        const { message, usage, userConsumedPower } = getUsage(record);
        return message.role === "assistant" && (usage != null || userConsumedPower != null);
      });
    };

    const applyUsage = (record: AgentChatMessageItem): void => {
      const { usage, userConsumedPower } = getUsage(record);
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

      let record: AgentChatMessageItem | undefined;
      try {
        const res = await listAgentConversationMessages(agentId, conversationId, {
          page: 1,
          pageSize: USAGE_HYDRATE_PAGE_SIZE,
        });
        record = findRecord(res.items ?? []);
      } catch (error) {
        console.warn("Failed to fetch agent conversation messages for usage hydration", error);
      }

      if (!isStillTargetable()) return;

      if (record) {
        const { usage, userConsumedPower } = getUsage(record);
        if (usage != null || userConsumedPower != null) {
          applyUsage(record);
          return;
        }
      }

      if (attempt + 1 < USAGE_HYDRATE_MAX_ATTEMPTS) {
        await sleep(USAGE_HYDRATE_RETRY_INTERVAL_MS);
      }
    }
  }, [agentId, conversationIdRef, scheduleTimeout, setChatMessages]);

  const refetchActiveConversationMessages = useCallback(
    async (conversationId: string | undefined): Promise<void> => {
      if (!conversationId || !isUUID(conversationId)) return;
      if (activeConversationIdRef.current !== conversationId) return;
      // Prefer live registry stream over history overwrite while still generating.
      if (registry.isStreaming(conversationId)) return;

      try {
        const pageSize = 50;
        const res = await listAgentConversationMessages(agentId, conversationId, {
          page: 1,
          pageSize,
        });
        if (activeConversationIdRef.current !== conversationId) return;
        if (registry.isStreaming(conversationId)) return;
        const total = res.total;
        const items = (res.items ?? []).map((item, idx) => {
          const base = (item.message ?? {}) as Record<string, unknown>;
          const baseMetadata = (base.metadata ?? {}) as Record<string, unknown>;
          const sequenceAsc = total - 1 - idx;
          return {
            ...base,
            id: item.id,
            role: (base.role ?? item.role) as UIMessage["role"],
            metadata: {
              ...baseMetadata,
              parentId: item.parentId ?? null,
              sequence: sequenceAsc,
            },
          } as UIMessage;
        });
        items.sort((a, b) => {
          const sa = (a.metadata as { sequence?: number } | undefined)?.sequence;
          const sb = (b.metadata as { sequence?: number } | undefined)?.sequence;
          return (typeof sa === "number" ? sa : 0) - (typeof sb === "number" ? sb : 0);
        });
        setChatMessages(items);
        if (items.length > 0) {
          lastMessageDbIdRef.current = items[items.length - 1].id;
        }
      } catch (error) {
        console.warn("Failed to refetch agent conversation messages after finish", error);
      }
    },
    [agentId, setChatMessages, lastMessageDbIdRef, registry],
  );

  // Keep Chat factory callbacks on the latest closures.
  hookApiRef.current = {
    navigate,
    queryClient,
    agentId,
    disableAutoNavigate,
    finalizeConversationSideEffects,
    refetchActiveConversationMessages,
    hydrateLastAssistantUsageFromServer,
    mapLatestMessageId,
    setConversationIdState,
    setStatusOverride,
    conversationIdRef,
    lastMessageDbIdRef,
    activeConversationIdRef,
    sendTargetConversationIdRef,
    pendingUserDbIdRef,
    pendingAssistantDbIdRef,
    registry,
    setSessionKey,
  };

  const durableTransport = useMemo(
    () => ({
      accept: (
        input: Parameters<typeof acceptOpencodeTurn>[1],
        request: { signal?: AbortSignal },
      ) => acceptOpencodeTurn(agentId, input, request),
      getStatus: (turnId: string, request: { signal?: AbortSignal }) =>
        getOpencodeTurnStatus(agentId, turnId, request),
      stop: (turnId: string, request: { signal?: AbortSignal }) =>
        stopOpencodeTurn(agentId, turnId, request),
    }),
    [agentId],
  );
  const initialDurableActivity = useMemo<OpencodeTurnActivity | null>(() => {
    if (!durableOpencodeTurnsEnabled || !normalizedRouteConversationId || !activeOpencodeTurn) {
      return null;
    }
    return { conversationId: normalizedRouteConversationId, ...activeOpencodeTurn };
  }, [durableOpencodeTurnsEnabled, normalizedRouteConversationId, activeOpencodeTurn]);
  const { client: durableTurnClient, snapshot: durableTurnSnapshot } = useDeterministicOpencodeTurn(
    {
      enabled: durableOpencodeTurnsEnabled,
      transport: durableTransport,
      initialActivity: initialDurableActivity,
      onAccepted: (accepted) => {
        if (!disableAutoNavigate && routeConversationId !== accepted.conversationId) {
          navigate(`/agents/${agentId}/c/${accepted.conversationId}`, { replace: true });
        }
        queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
      },
      onTerminal: async (terminal) => {
        if (activeConversationIdRef.current === terminal.conversationId) {
          await refetchActiveConversationMessages(terminal.conversationId);
        }
        finalizeConversationSideEffects(`opencode-turn:${terminal.turnId}`);
      },
    },
  );
  const durableActivity = durableTurnSnapshot.activities.find(
    (activity) => activity.conversationId === activeConversationIdRef.current,
  );

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
  }, [registry, conversationIdRef, sessionKey]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (durableOpencodeTurnsEnabled) {
        toast.error("OpenCode durable conversations do not support regeneration yet");
        return;
      }
      if (status === "streaming" || status === "submitted") return;
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

      const key =
        targetConversationId && isUUID(targetConversationId) ? targetConversationId : sessionKey;
      const chat = registry.getOrCreate(key, () => createChatForKey(key));
      if (chat !== activeChat) {
        setActiveChat(chat);
      }

      void chat.regenerate({
        messageId: msg.id,
        body: { trigger: "regenerate-message" },
      });
    },
    [
      messages,
      resolveMessageDbId,
      status,
      beginStreamForActiveConversation,
      conversationIdRef,
      pendingParentIdRef,
      sessionKey,
      registry,
      createChatForKey,
      activeChat,
      durableOpencodeTurnsEnabled,
    ],
  );

  const send = useCallback(
    (
      content: string,
      parentId?: string | null,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      if (durableOpencodeTurnsEnabled) {
        if (durableActivity) return;
        const text = content.trim();
        if (!text && (!files || files.length === 0)) return;
        let prepared;
        try {
          prepared = durableTurnClient.prepare({
            conversationId: conversationIdRef.current,
            message: {
              role: "user",
              parts: [
                ...(text ? [{ type: "text" as const, text }] : []),
                ...(files ?? []).map((file) => ({
                  type: "file" as const,
                  url: file.url,
                  mediaType: file.mediaType || "application/octet-stream",
                  ...(file.filename ? { filename: file.filename } : {}),
                })),
              ],
            },
            formVariables: formVariablesRef.current,
            formFieldsInputs: formFieldsInputsRef.current,
            isDebug,
          });
        } catch (error) {
          toast.error((error as Error).message);
          return;
        }
        conversationIdRef.current = prepared.conversationId;
        activeConversationIdRef.current = prepared.conversationId;
        setConversationIdState(prepared.conversationId);
        const stableChat = registry.getOrCreate(prepared.conversationId, () =>
          createChatForKey(prepared.conversationId),
        );
        stableChat.messages = [
          ...messagesRef.current,
          {
            id: `opencode-user:${prepared.turnId}`,
            role: "user",
            parts: prepared.message.parts,
            metadata: { opencodeTurnId: prepared.turnId },
          } as UIMessage,
        ];
        registry.setActive(prepared.conversationId);
        setSessionKey(prepared.conversationId);
        if (stableChat !== activeChat) setActiveChat(stableChat);
        void durableTurnClient.acceptPrepared(prepared).catch((error) => {
          const remainsRecoverable = durableTurnClient
            .getSnapshot()
            .activities.some((activity) => activity.turnId === prepared.turnId);
          if (remainsRecoverable) {
            console.warn("OpenCode durable turn acceptance is awaiting recovery", error);
            return;
          }
          stableChat.messages = stableChat.messages.filter(
            (message) =>
              (message.metadata as { opencodeTurnId?: string } | undefined)?.opencodeTurnId !==
              prepared.turnId,
          );
          toast.error((error as Error).message || "OpenCode turn was rejected");
        });
        return;
      }
      if (status === "streaming" || status === "submitted") return;
      if (!content.trim() && (!files || files.length === 0)) return;
      setStatusOverride(null);
      pendingParentIdRef.current =
        parentId !== undefined
          ? (resolveMessageDbId(parentId) ?? null)
          : lastMessageDbIdRef.current;

      const targetConversationId = conversationIdRef.current;
      sendTargetConversationIdRef.current = targetConversationId ?? null;
      if (!beginStreamForActiveConversation()) return;

      // Always send on the registry Chat for this focus key so we cannot orphan
      // the HTTP stream onto a different instance than useChat is displaying.
      const key =
        targetConversationId && isUUID(targetConversationId) ? targetConversationId : sessionKey;
      const chat = registry.getOrCreate(key, () => createChatForKey(key));
      if (chat !== activeChat) {
        setActiveChat(chat);
      }

      const fileParts: FileUIPart[] | undefined =
        files && files.length > 0
          ? files.map((file) => ({
              type: "file" as const,
              url: file.url,
              mediaType: file.mediaType || "application/octet-stream",
              ...(file.filename && { filename: file.filename }),
            }))
          : undefined;

      void chat.sendMessage({
        text: content.trim() || "",
        ...(fileParts && { files: fileParts }),
      });
    },
    [
      status,
      lastMessageDbIdRef,
      resolveMessageDbId,
      beginStreamForActiveConversation,
      conversationIdRef,
      pendingParentIdRef,
      sessionKey,
      registry,
      createChatForKey,
      activeChat,
      durableOpencodeTurnsEnabled,
      durableActivity,
      durableTurnClient,
      isDebug,
      disableAutoNavigate,
      routeConversationId,
      navigate,
      agentId,
      queryClient,
      registry,
      createChatForKey,
      activeChat,
    ],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

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
      return;
    }

    const last = messages[messages.length - 1];
    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }: { message: UIMessage }) => message.role === "user")?.index;
    if (lastUserIndex !== undefined && pendingUserDbIdRef.current) {
      messageDbIdMapRef.current.set(messages[lastUserIndex].id, pendingUserDbIdRef.current);
      pendingUserDbIdRef.current = null;
    }
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
    if (durableOpencodeTurnsEnabled) return;
    const conversationId = activeConversationIdRef.current;
    if (!conversationId) return;
    const hasStreamingRegistryChat = registry.isStreaming(conversationId);
    // Registry can stay "streaming" after the HTTP fetch was orphaned; chatStatus
    // is the real signal for whether useChat is receiving deltas.
    if (hasStreamingRegistryChat && status !== "streaming" && status !== "submitted") {
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

        const withoutPreview = prev.filter(
          (m) =>
            !(m.metadata as { isOpencodeLivePreview?: boolean } | undefined)?.isOpencodeLivePreview,
        );
        return [...withoutPreview, preview];
      });
    };

    const poll = async () => {
      if (disposed) return;
      if (activeConversationIdRef.current !== conversationId) return;
      if (!isBackgroundStreamGenerating(conversationId) && !isOpencodeTurnRunning) return;

      try {
        const { messages: ocMessages } = await getAgentOpencodeSessionMessages(
          agentId,
          conversationId,
        );
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

    if (token) {
      sseAbortController = new AbortController();
      const MIN_SSE_PREVIEW_MS = 500;
      let pollingCleanup: (() => void) | undefined;

      const sseStart = Date.now();
      void subscribeOpencodeSessionEvents({
        url: `${getApiBaseUrl()}/api/ai-agents/${agentId}/chat/conversations/${conversationId}/opencode-session/events`,
        headers: { Authorization: `Bearer ${token}` },
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
          // Avoid flicker: if SSE fails before producing a preview, start polling.
          if (!pollingCleanup && Date.now() - sseStart >= MIN_SSE_PREVIEW_MS) {
            pollingCleanup = startPolling();
          }
        },
      });

      // If SSE is silent for too long, start polling as a fallback.
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
    agentId,
    routeConversationId,
    status,
    setChatMessages,
    isOpencodeTurnRunning,
    token,
    refetchActiveConversationMessages,
    finalizeConversationSideEffects,
    registry,
    durableOpencodeTurnsEnabled,
  ]);

  const getDbMessageId = useCallback((clientMessageId: string): string | undefined => {
    return messageDbIdMapRef.current.get(clientMessageId);
  }, []);

  const resolvedConversationId =
    routeConversationId && isUUID(routeConversationId)
      ? routeConversationId
      : (conversationIdState ??
        (conversationIdRef.current && isUUID(conversationIdRef.current)
          ? conversationIdRef.current
          : undefined));

  const effectiveStatus: ChatStatus = durableActivity
    ? durableActivity.status === "accepted"
      ? "submitted"
      : "streaming"
    : (statusOverride ?? status);

  const stopWithFinalize = useCallback(() => {
    if (durableOpencodeTurnsEnabled) {
      if (durableActivity) {
        void durableTurnClient.stop(durableActivity.turnId).catch((error) => {
          console.warn("Failed to request exact OpenCode turn cancellation", error);
        });
      }
      return;
    }
    const conversationId =
      (conversationIdRef.current && isUUID(conversationIdRef.current)
        ? conversationIdRef.current
        : undefined) ?? (isUUID(sessionKey) ? sessionKey : undefined);
    const targetAssistantId = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "assistant")?.id;
    const token =
      conversationId && targetAssistantId ? `${conversationId}:${targetAssistantId}` : undefined;

    if (conversationId && agentId) {
      void stopAgentConversation(agentId, conversationId).catch((error) => {
        console.warn("Failed to stop OpenCode conversation turn", error);
      });
    }
    stop();
    if (conversationId) {
      registry.setStatus(conversationId, "completed");
    }
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
    conversationIdRef,
    sessionKey,
    agentId,
    registry,
    durableOpencodeTurnsEnabled,
    durableActivity,
    durableTurnClient,
  ]);

  return {
    conversationId: resolvedConversationId,
    messages,
    status: effectiveStatus,
    streamingMessageId: durableActivity?.turnId ?? streamingMessageId,
    setMessages: setChatMessages,
    send,
    stop: stopWithFinalize,
    regenerate: handleRegenerate,
    addToolApprovalResponse,
    getDbMessageId,
  };
}
