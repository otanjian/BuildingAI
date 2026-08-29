import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import type { AutomationRun, AutomationTask } from "../console/automations";

export type {
    AutomationDeliveryStatus,
    AutomationDispatchStatus,
    AutomationJobStatus,
    AutomationRun,
    AutomationRunStatus,
    AutomationTask,
} from "../console/automations";

const QUERY_KEY = ["automations"] as const;

export function useAutomationTasksQuery(options?: QueryOptionsUtil<AutomationTask[]>) {
    return useQuery<AutomationTask[]>({
        queryKey: QUERY_KEY,
        queryFn: () => apiHttpClient.get<AutomationTask[]>("/automations"),
        ...options,
    });
}

export function useAutomationTaskMutation(
    options?: MutationOptionsUtil<
        AutomationTask,
        { id: string; operation: "pause" | "resume" | "cancel"; expectedUpdatedAt?: string }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation<
        AutomationTask,
        Error,
        { id: string; operation: "pause" | "resume" | "cancel"; expectedUpdatedAt?: string }
    >({
        ...options,
        mutationFn: ({ id, operation, expectedUpdatedAt }) =>
            apiHttpClient.patch<AutomationTask>(
                `/automations/${id}/${operation}`,
                expectedUpdatedAt ? { expectedUpdatedAt } : undefined,
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useDeleteAutomationTaskMutation(
    options?: MutationOptionsUtil<AutomationTask, { id: string; expectedUpdatedAt?: string }>,
) {
    const queryClient = useQueryClient();
    return useMutation<AutomationTask, Error, { id: string; expectedUpdatedAt?: string }>({
        ...options,
        mutationFn: ({ id, expectedUpdatedAt }) =>
            apiHttpClient.delete<AutomationTask>(`/automations/${id}`, {
                data: expectedUpdatedAt ? { expectedUpdatedAt } : undefined,
            }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}

export function useRunAutomationTaskMutation(
    options?: MutationOptionsUtil<AutomationRun, { id: string; idempotencyKey: string }>,
) {
    const queryClient = useQueryClient();
    return useMutation<AutomationRun, Error, { id: string; idempotencyKey: string }>({
        ...options,
        mutationFn: ({ id, idempotencyKey }) =>
            apiHttpClient.post<AutomationRun>(`/automations/${id}/run`, undefined, {
                headers: { "idempotency-key": idempotencyKey },
            }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}
