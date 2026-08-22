import { useMutation, useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import { fetchAllConversationPages } from "./conversation-pagination";

export type AgentChatRecordItem = {
    id: string;
    title?: string | null;
    agentId: string;
    userId?: string | null;
    anonymousIdentifier?: string | null;
    userName?: string;
    userAvatar?: string;
    messageCount: number;
    totalTokens: number;
    consumedPower: number;
    feedbackStatus?: { like: number; dislike: number } | null;
    metadata?: Record<string, any> | null;
    archivedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    activeTurn: OpencodeActiveTurnSummary | null;
};

export type OpencodeActiveTurnSummary = {
    turnId: string;
    status: "accepted" | "running" | "committing";
    lastActivityAt: string;
    cancelRequested: boolean;
};

export type AgentChatConversationDetail = {
    id: string;
    title?: string | null;
    archivedAt?: string | null;
    activeTurn: OpencodeActiveTurnSummary | null;
    metadata?: Record<string, unknown> | null;
};

export async function replyLegacyAgentOpencodeQuestion(
    agentId: string,
    conversationId: string,
    input: { requestId: string; answers: string[][] },
): Promise<void> {
    await apiHttpClient.post(
        `/ai-agents/${agentId}/chat/conversations/${conversationId}/opencode-question/reply`,
        input,
    );
}

export async function rejectLegacyAgentOpencodeQuestion(
    agentId: string,
    conversationId: string,
    requestId: string,
): Promise<void> {
    await apiHttpClient.post(
        `/ai-agents/${agentId}/chat/conversations/${conversationId}/opencode-question/reject`,
        { requestId },
    );
}

export type AgentChatMessageItem = {
    id: string;
    conversationId: string;
    agentId: string;
    role: "user" | "assistant" | "system";
    message: { role: string; parts?: unknown[]; [key: string]: unknown };
    status: "streaming" | "completed" | "failed";
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ListAgentConversationsParams = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    sortBy?: "createdAt" | "updatedAt";
    includeDebug?: boolean;
    includeAnonymous?: boolean;
    includeArchived?: boolean;
};

export type ListAgentConversationsResult = {
    items: AgentChatRecordItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export async function listAgentConversations(
    agentId: string,
    params?: ListAgentConversationsParams,
): Promise<ListAgentConversationsResult> {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.pageSize != null) search.set("pageSize", String(params.pageSize));
    if (params?.keyword != null && params.keyword.trim())
        search.set("keyword", params.keyword.trim());
    if (params?.sortBy != null) search.set("sortBy", params.sortBy);
    if (params?.includeDebug != null) search.set("includeDebug", String(params.includeDebug));
    if (params?.includeAnonymous != null)
        search.set("includeAnonymous", String(params.includeAnonymous));
    if (params?.includeArchived != null)
        search.set("includeArchived", String(params.includeArchived));
    const qs = search.toString();
    const path = qs
        ? `/ai-agents/${agentId}/chat/conversations?${qs}`
        : `/ai-agents/${agentId}/chat/conversations`;
    return apiHttpClient.get<ListAgentConversationsResult>(path);
}

export function getAgentConversationDetail(
    agentId: string,
    conversationId: string,
): Promise<AgentChatConversationDetail> {
    return apiHttpClient.get<AgentChatConversationDetail>(
        `/ai-agents/${agentId}/chat/conversations/${conversationId}`,
    );
}

export type ListConversationMessagesParams = {
    page?: number;
    pageSize?: number;
};

export type ListConversationMessagesResult = {
    items: AgentChatMessageItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export async function listAgentConversationMessages(
    agentId: string,
    conversationId: string,
    params?: ListConversationMessagesParams,
): Promise<ListConversationMessagesResult> {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.pageSize != null) search.set("pageSize", String(params.pageSize));
    const qs = search.toString();
    const path = qs
        ? `/ai-agents/${agentId}/chat/conversations/${conversationId}/messages?${qs}`
        : `/ai-agents/${agentId}/chat/conversations/${conversationId}/messages`;
    return apiHttpClient.get<ListConversationMessagesResult>(path);
}

export async function createOperatorAgentMessage(
    agentId: string,
    conversationId: string,
    content: string,
): Promise<AgentChatMessageItem> {
    return apiHttpClient.post<AgentChatMessageItem>(
        `/ai-agents/${agentId}/chat/conversations/${conversationId}/messages/operator`,
        { content },
    );
}

export type OpencodeSessionMessage = {
    info?: { id?: string; role?: string; finish?: string | null; error?: unknown };
    parts?: Array<Record<string, unknown>>;
};

export type GetOpencodeSessionMessagesResult = {
    sessionId: string | undefined;
    messages: OpencodeSessionMessage[];
};

export async function getAgentOpencodeSessionMessages(
    agentId: string,
    conversationId: string,
): Promise<GetOpencodeSessionMessagesResult> {
    return apiHttpClient.get<GetOpencodeSessionMessagesResult>(
        `/ai-agents/${agentId}/chat/conversations/${conversationId}/opencode-session/messages`,
    );
}

export function useAgentOpencodeSessionMessagesQuery(
    agentId: string | undefined,
    conversationId: string | undefined,
    options?: { enabled?: boolean; refetchInterval?: number | false },
) {
    return useQuery({
        queryKey: ["agents", "chat", "opencode-session", agentId ?? "", conversationId ?? ""],
        queryFn: () => getAgentOpencodeSessionMessages(agentId!, conversationId!),
        enabled: Boolean(agentId && conversationId) && options?.enabled !== false,
        refetchInterval: options?.refetchInterval ?? false,
        staleTime: 1_000,
    });
}

const CONVERSATIONS_KEY = ["agents", "chat", "conversations"] as const;
const MESSAGES_KEY = ["agents", "chat", "messages"] as const;

export function useAgentConversationsQuery(
    agentId: string | undefined,
    params?: ListAgentConversationsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...CONVERSATIONS_KEY, agentId ?? "", params],
        queryFn: () =>
            fetchAllConversationPages((page) =>
                listAgentConversations(agentId!, { ...params, page }),
            ),
        enabled: !!agentId && options?.enabled !== false,
        refetchInterval: (query) => {
            const items = (query.state.data as { items?: AgentChatRecordItem[] } | undefined)
                ?.items;
            if (!items?.length) return false;
            return items.some((item) => item.activeTurn) ? 4000 : false;
        },
    });
}

export function useAgentConversationDetailQuery(
    agentId: string | undefined,
    conversationId: string | undefined,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["agents", "chat", "conversation", agentId ?? "", conversationId ?? ""],
        queryFn: () => getAgentConversationDetail(agentId!, conversationId!),
        enabled: !!agentId && !!conversationId && options?.enabled !== false,
        refetchInterval: (query) =>
            (query.state.data as AgentChatConversationDetail | undefined)?.activeTurn
                ? 4000
                : false,
    });
}

export function useAgentConversationMessagesQuery(
    agentId: string | undefined,
    conversationId: string | undefined,
    params?: ListConversationMessagesParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...MESSAGES_KEY, agentId ?? "", conversationId ?? "", params],
        queryFn: () => listAgentConversationMessages(agentId!, conversationId!, params),
        enabled: !!agentId && !!conversationId && options?.enabled !== false,
    });
}

export function useCreateOperatorAgentMessageMutation(agentId: string, conversationId: string) {
    return useMutation({
        mutationFn: (content: string) =>
            createOperatorAgentMessage(agentId, conversationId, content),
    });
}
