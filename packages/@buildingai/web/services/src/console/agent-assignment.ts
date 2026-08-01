import type { MutationOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type AgentAssignmentItem = {
    id: string;
    agentId: string;
    userId: string;
    assignedBy: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        nickname: string | null;
    };
};

/**
 * 获取智能体已分配用户列表
 */
export function useAgentAssignmentsQuery(agentId: string | undefined) {
    return useQuery({
        queryKey: ["console", "agents", "assignments", agentId ?? ""],
        queryFn: () =>
            consoleHttpClient.get<AgentAssignmentItem[]>(`/agents/${agentId}/assignments`),
        enabled: !!agentId,
    });
}

/**
 * 批量分配用户到智能体
 */
export function useAssignUsersMutation(
    agentId: string,
    options?: MutationOptionsUtil<AgentAssignmentItem[], { userIds: string[] }>,
) {
    const queryClient = useQueryClient();
    return useMutation<AgentAssignmentItem[], Error, { userIds: string[] }>({
        mutationFn: ({ userIds }) =>
            consoleHttpClient.post<AgentAssignmentItem[]>(`/agents/${agentId}/assignments`, {
                userIds,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["console", "agents", "assignments", agentId],
            });
        },
        ...options,
    });
}

/**
 * 批量移除用户分配
 */
export function useUnassignUsersMutation(
    agentId: string,
    options?: MutationOptionsUtil<void, { userIds: string[] }>,
) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { userIds: string[] }>({
        mutationFn: ({ userIds }) =>
            consoleHttpClient.delete<void>(`/agents/${agentId}/assignments`, {
                data: { userIds },
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["console", "agents", "assignments", agentId],
            });
        },
        ...options,
    });
}

/**
 * 更新智能体广场可见性
 */
export function useUpdateSquareVisibilityMutation(
    agentId: string,
    options?: MutationOptionsUtil<{ squareVisibility: string }, { visibility: "all" | "assigned" }>,
) {
    return useMutation<{ squareVisibility: string }, Error, { visibility: "all" | "assigned" }>({
        mutationFn: ({ visibility }) =>
            consoleHttpClient.post<{ squareVisibility: string }>(
                `/agents/${agentId}/square-visibility`,
                {
                    visibility,
                },
            ),
        ...options,
    });
}
