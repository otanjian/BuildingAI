import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleMcpApiKey = {
    id: string;
    label: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
};

export type ConsoleMcpApiKeyCreateResult = ConsoleMcpApiKey & {
    secret: string;
};

export type CreateConsoleMcpApiKeyDto = {
    label: string;
};

const QUERY_KEY = ["console-mcp-keys"] as const;

export function useConsoleMcpApiKeysQuery(options?: QueryOptionsUtil<ConsoleMcpApiKey[]>) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => consoleHttpClient.get<ConsoleMcpApiKey[]>("/console-mcp-keys"),
        ...options,
    });
}

export function useCreateConsoleMcpApiKeyMutation(
    options?: MutationOptionsUtil<ConsoleMcpApiKeyCreateResult, CreateConsoleMcpApiKeyDto>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (dto: CreateConsoleMcpApiKeyDto) =>
            consoleHttpClient.post<ConsoleMcpApiKeyCreateResult>("/console-mcp-keys", dto),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useRevokeConsoleMcpApiKeyMutation(
    options?: MutationOptionsUtil<{ success: boolean }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (id: string) =>
            consoleHttpClient.delete<{ success: boolean }>(`/console-mcp-keys/${id}`),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}
