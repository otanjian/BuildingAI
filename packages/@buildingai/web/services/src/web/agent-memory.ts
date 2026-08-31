import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AgentMemoryAgentOption = { id: string; name: string };
export type AgentMemoryItem = {
    id: string;
    agentId: string;
    agentName: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};
export type AgentMemoryInput = { agentId: string; content: string };

const AGENT_MEMORY_KEY = ["ai-agent-memories"] as const;

export function useAgentMemoriesQuery(
    options?: QueryOptionsUtil<AgentMemoryItem[]> & { limit?: number },
) {
    const { limit = 100, ...rest } = options ?? {};
    return useQuery<AgentMemoryItem[]>({
        queryKey: [...AGENT_MEMORY_KEY, limit],
        queryFn: () =>
            apiHttpClient.get<AgentMemoryItem[]>("/ai-agent-memories", { params: { limit } }),
        ...rest,
    });
}

export function useAccessibleMemoryAgentsQuery(
    options?: QueryOptionsUtil<AgentMemoryAgentOption[]>,
) {
    return useQuery<AgentMemoryAgentOption[]>({
        queryKey: [...AGENT_MEMORY_KEY, "agents"],
        queryFn: () => apiHttpClient.get<AgentMemoryAgentOption[]>("/ai-agent-memories/agents"),
        ...options,
    });
}

export function useCreateAgentMemoryMutation(
    options?: MutationOptionsUtil<AgentMemoryItem, AgentMemoryInput>,
) {
    const queryClient = useQueryClient();
    return useMutation<AgentMemoryItem, Error, AgentMemoryInput>({
        mutationFn: (input) => apiHttpClient.post<AgentMemoryItem>("/ai-agent-memories", input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENT_MEMORY_KEY }),
        ...options,
    });
}

export function useUpdateAgentMemoryMutation(
    options?: MutationOptionsUtil<AgentMemoryItem, { id: string } & Partial<AgentMemoryInput>>,
) {
    const queryClient = useQueryClient();
    return useMutation<AgentMemoryItem, Error, { id: string } & Partial<AgentMemoryInput>>({
        mutationFn: ({ id, ...input }) =>
            apiHttpClient.patch<AgentMemoryItem>(`/ai-agent-memories/${id}`, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENT_MEMORY_KEY }),
        ...options,
    });
}

export function useDeactivateAgentMemoryMutation(options?: MutationOptionsUtil<void, string>) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => apiHttpClient.delete(`/ai-agent-memories/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENT_MEMORY_KEY }),
        ...options,
    });
}

export function useClearAgentMemoriesMutation(options?: MutationOptionsUtil<void, void>) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, void>({
        mutationFn: () => apiHttpClient.delete("/ai-agent-memories/all"),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENT_MEMORY_KEY }),
        ...options,
    });
}
