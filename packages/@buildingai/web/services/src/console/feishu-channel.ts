import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type FeishuConnectionState = "stopped" | "connecting" | "connected" | "error";

export type FeishuChannelStatus = {
    connectionId?: string;
    name?: string;
    agentId: string;
    agentName?: string;
    appId: string;
    enabled: boolean;
    onlyMentioned: boolean;
    connectionState: FeishuConnectionState;
    lastError?: string;
    updatedAt?: string;
    migrationStatus?: "active" | "legacy" | "conflict" | "orphaned" | "deleting";
    migrationError?: string | null;
    hasAppSecret?: boolean;
    hasAgentAccessToken?: boolean;
};

export type FeishuConnectionStatus = FeishuChannelStatus & {
    connectionId: string;
    name: string;
};

export type QueryFeishuConnectionsDto = {
    page?: number;
    pageSize?: number;
    agentId?: string;
    keyword?: string;
    enabled?: boolean;
    connectionState?: FeishuConnectionState;
};

export type CreateFeishuConnectionDto = {
    agentId: string;
    name: string;
    appId: string;
    appSecret: string;
    agentAccessToken?: string;
    enabled?: boolean;
    onlyMentioned?: boolean;
};

export type UpdateFeishuConnectionDto = Partial<Omit<CreateFeishuConnectionDto, "agentId">> & {
    connectionId?: string;
    agentId?: string;
};

export type UpdateFeishuChannelDto = {
    agentId: string;
    appId?: string;
    appSecret?: string;
    agentAccessToken?: string;
    enabled?: boolean;
    onlyMentioned?: boolean;
};

const QUERY_KEY = ["console", "feishu-channel"] as const;

export function useFeishuChannelsQuery(options?: QueryOptionsUtil<FeishuChannelStatus[]>) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => consoleHttpClient.get<FeishuChannelStatus[]>("/feishu-channel"),
        ...options,
    });
}

export function useSaveFeishuChannelMutation(
    options?: MutationOptionsUtil<FeishuChannelStatus, UpdateFeishuChannelDto>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (dto: UpdateFeishuChannelDto) =>
            consoleHttpClient.put<FeishuChannelStatus>(`/feishu-channel/${dto.agentId}`, dto),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useTestFeishuChannelMutation(
    options?: MutationOptionsUtil<{ success: true }, UpdateFeishuChannelDto>,
) {
    return useMutation({
        mutationFn: (dto: UpdateFeishuChannelDto) =>
            consoleHttpClient.post<{ success: true }>(`/feishu-channel/${dto.agentId}/test`, dto),
        ...options,
    });
}

export function useToggleFeishuChannelMutation(
    options?: MutationOptionsUtil<FeishuChannelStatus, { agentId: string; enabled: boolean }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ agentId, enabled }) =>
            consoleHttpClient.post<FeishuChannelStatus>(`/feishu-channel/${agentId}/toggle`, {
                enabled,
            }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

const CONNECTIONS_QUERY_KEY = ["console", "feishu-channel", "connections"] as const;

export function useFeishuConnectionsQuery(
    params?: QueryFeishuConnectionsDto,
    options?: PaginatedQueryOptionsUtil<FeishuConnectionStatus>,
) {
    return useQuery({
        queryKey: [...CONNECTIONS_QUERY_KEY, params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<FeishuConnectionStatus>>(
                "/feishu-channel/connections",
                {
                    params,
                },
            ),
        ...options,
    });
}

export function useFeishuConnectionQuery(id: string | undefined) {
    return useQuery({
        queryKey: [...CONNECTIONS_QUERY_KEY, id],
        queryFn: () =>
            consoleHttpClient.get<FeishuConnectionStatus>(`/feishu-channel/connections/${id}`),
        enabled: Boolean(id),
    });
}

export function useCreateFeishuConnectionMutation(
    options?: MutationOptionsUtil<FeishuConnectionStatus, CreateFeishuConnectionDto>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (dto) =>
            consoleHttpClient.post<FeishuConnectionStatus>("/feishu-channel/connections", dto),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useUpdateFeishuConnectionMutation(
    options?: MutationOptionsUtil<
        FeishuConnectionStatus,
        { id: string; dto: UpdateFeishuConnectionDto }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.put<FeishuConnectionStatus>(`/feishu-channel/connections/${id}`, dto),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useTestFeishuConnectionMutation(
    options?: MutationOptionsUtil<{ success: true }, UpdateFeishuConnectionDto>,
) {
    return useMutation({
        ...options,
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: true }>("/feishu-channel/connections/test", dto),
    });
}

export function useToggleFeishuConnectionMutation(
    options?: MutationOptionsUtil<FeishuConnectionStatus, { id: string; enabled: boolean }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id, enabled }) =>
            consoleHttpClient.post<FeishuConnectionStatus>(
                `/feishu-channel/connections/${id}/toggle`,
                { enabled },
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useDeleteFeishuConnectionMutation(options?: MutationOptionsUtil<void, string>) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (id) => consoleHttpClient.delete(`/feishu-channel/connections/${id}`),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}
