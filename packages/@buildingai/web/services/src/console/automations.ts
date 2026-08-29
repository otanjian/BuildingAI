import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type AutomationJobStatus = "active" | "paused" | "cancelled" | "completed" | "failed";
export type AutomationRunStatus =
    | "pending"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "timed_out"
    | "cancelled"
    | "unknown"
    | "skipped";
export type AutomationDeliveryStatus =
    | "pending"
    | "delivered"
    | "failed"
    | "unknown"
    | "dismissed";
export type AutomationDispatchStatus =
    | "pending"
    | "leased"
    | "sent"
    | "failed"
    | "unknown"
    | "dismissed";

export type AutomationRuntimeStatus = {
    schedulerActive: boolean;
    activeJobs: number;
    pendingDispatches: number;
    leasedDispatches: number;
    unknownDispatches: number;
    oldestDueLagSeconds: number;
};

export type AutomationTask = {
    id: string;
    name: string;
    updatedAt: string;
    agentId: string;
    scheduleKind: "at" | "every" | "cron";
    schedule: Record<string, unknown>;
    timezone: string;
    channel: string;
    status: AutomationJobStatus;
    nextRunAt: string;
    lastRunAt: string | null;
    creatorId: string;
    deliveryStatus: AutomationDeliveryStatus;
    lastRunStatus?: AutomationRunStatus;
    lastRunResultPreview?: string | null;
    lastRunErrorPreview?: string | null;
    dispatchStatus?: AutomationDispatchStatus;
};

export type AutomationRun = {
    id: string;
    jobId: string;
    occurrenceKey: string;
    trigger: "scheduled" | "manual" | "catch_up";
    status: AutomationRunStatus;
    scheduledAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    attempt: number;
    resultPreview: string | null;
    errorPreview: string | null;
    deliveryStatus: AutomationDeliveryStatus;
    providerMessageId: string | null;
};

export type AutomationDispatch = {
    id: string;
    createdAt: string;
    jobId: string;
    runId: string;
    dispatchKey: string;
    kind: "execute" | "deliver" | "failure";
    status: AutomationDispatchStatus;
    attempts: number;
    leaseUntil: string | null;
    nextAttemptAt: string | null;
    sentAt: string | null;
    lastError: string | null;
};

const AUTOMATION_QUERY_KEY = ["console", "automations"] as const;

export function useAutomationStatusQuery(options?: QueryOptionsUtil<AutomationRuntimeStatus>) {
    return useQuery<AutomationRuntimeStatus>({
        queryKey: [...AUTOMATION_QUERY_KEY, "status"],
        queryFn: () => consoleHttpClient.get<AutomationRuntimeStatus>("/automations/status"),
        ...options,
    });
}

export function useAutomationTasksQuery(options?: QueryOptionsUtil<AutomationTask[]>) {
    return useQuery<AutomationTask[]>({
        queryKey: [...AUTOMATION_QUERY_KEY, "tasks"],
        queryFn: () => consoleHttpClient.get<AutomationTask[]>("/automations/tasks"),
        ...options,
    });
}

export function useAutomationRunsQuery(
    jobId?: string,
    options?: QueryOptionsUtil<AutomationRun[]>,
) {
    return useQuery<AutomationRun[]>({
        queryKey: [...AUTOMATION_QUERY_KEY, "runs", jobId ?? "all"],
        queryFn: () =>
            consoleHttpClient.get<AutomationRun[]>("/automations/runs", {
                params: jobId ? { jobId } : undefined,
            }),
        ...options,
    });
}

export function useAutomationDispatchesQuery(
    status?: AutomationDispatchStatus,
    options?: QueryOptionsUtil<AutomationDispatch[]>,
) {
    return useQuery<AutomationDispatch[]>({
        queryKey: [...AUTOMATION_QUERY_KEY, "dispatches", status ?? "all"],
        queryFn: () =>
            consoleHttpClient.get<AutomationDispatch[]>("/automations/dispatches", {
                params: status ? { status } : undefined,
            }),
        ...options,
    });
}

export function useAutomationDispatchRecoveryMutation(
    options?: MutationOptionsUtil<AutomationDispatch, { id: string; action: "retry" | "dismiss" }>,
) {
    const queryClient = useQueryClient();
    return useMutation<AutomationDispatch, Error, { id: string; action: "retry" | "dismiss" }>({
        ...options,
        mutationFn: ({ id, action }) =>
            consoleHttpClient.patch<AutomationDispatch>(`/automations/dispatches/${id}/${action}`),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEY });
            options?.onSuccess?.(...args);
        },
    });
}
