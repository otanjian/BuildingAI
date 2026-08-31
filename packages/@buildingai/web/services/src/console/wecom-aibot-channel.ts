import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type WecomAibotConnectionState = "stopped" | "connecting" | "connected" | "error";

export type WecomAibotConnectionStatus = {
    connectionId: string;
    name: string;
    agentId: string;
    agentName?: string;
    botId: string;
    enabled: boolean;
    connectionState: WecomAibotConnectionState;
    lastError?: string;
    updatedAt?: string;
    hasBotSecret: boolean;
    hasAgentAccessToken: boolean;
};

export type QueryWecomAibotConnectionsDto = {
    page?: number;
    pageSize?: number;
    agentId?: string;
    keyword?: string;
    enabled?: boolean;
    connectionState?: WecomAibotConnectionState;
};

export type CreateWecomAibotConnectionDto = {
    agentId: string;
    name: string;
    botId: string;
    botSecret: string;
    agentAccessToken: string;
};

export type UpdateWecomAibotConnectionDto = Partial<CreateWecomAibotConnectionDto> & {
    connectionId?: string;
};

const QUERY_KEY = ["console", "wecom-aibot-channel", "connections"] as const;

export function useWecomAibotConnectionsQuery(
    params?: QueryWecomAibotConnectionsDto,
    options?: PaginatedQueryOptionsUtil<WecomAibotConnectionStatus>,
) {
    return useQuery({
        queryKey: [...QUERY_KEY, params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<WecomAibotConnectionStatus>>(
                "/wecom-aibot-channel/connections",
                { params },
            ),
        ...options,
    });
}

export function useWecomAibotConnectionQuery(id: string | undefined) {
    return useQuery({
        queryKey: [...QUERY_KEY, id],
        queryFn: () =>
            consoleHttpClient.get<WecomAibotConnectionStatus>(
                `/wecom-aibot-channel/connections/${id}`,
            ),
        enabled: Boolean(id),
    });
}

export function useCreateWecomAibotConnectionMutation(
    options?: MutationOptionsUtil<WecomAibotConnectionStatus, CreateWecomAibotConnectionDto>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (dto) =>
            consoleHttpClient.post<WecomAibotConnectionStatus>(
                "/wecom-aibot-channel/connections",
                dto,
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useUpdateWecomAibotConnectionMutation(
    options?: MutationOptionsUtil<
        WecomAibotConnectionStatus,
        { id: string; dto: UpdateWecomAibotConnectionDto }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id, dto }) =>
            consoleHttpClient.put<WecomAibotConnectionStatus>(
                `/wecom-aibot-channel/connections/${id}`,
                dto,
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useTestWecomAibotConnectionMutation(
    options?: MutationOptionsUtil<{ success: true }, UpdateWecomAibotConnectionDto>,
) {
    return useMutation({
        ...options,
        mutationFn: (dto) =>
            consoleHttpClient.post<{ success: true }>("/wecom-aibot-channel/connections/test", dto),
    });
}

export function useToggleWecomAibotConnectionMutation(
    options?: MutationOptionsUtil<WecomAibotConnectionStatus, { id: string; enabled: boolean }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id, enabled }) =>
            consoleHttpClient.post<WecomAibotConnectionStatus>(
                `/wecom-aibot-channel/connections/${id}/toggle`,
                { enabled },
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useDeleteWecomAibotConnectionMutation(options?: MutationOptionsUtil<void, string>) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (id) => consoleHttpClient.delete(`/wecom-aibot-channel/connections/${id}`),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}
