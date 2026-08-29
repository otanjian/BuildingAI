export const AUTOMATION_SCHEDULE_KINDS = ["at", "every", "cron"] as const;
export type AutomationScheduleKind = (typeof AUTOMATION_SCHEDULE_KINDS)[number];

export const AUTOMATION_LIFECYCLE_STATUSES = [
    "active",
    "paused",
    "cancelled",
    "completed",
    "failed",
] as const;
export type AutomationLifecycleStatus = (typeof AUTOMATION_LIFECYCLE_STATUSES)[number];

export const AUTOMATION_RUN_STATUSES = [
    "pending",
    "queued",
    "running",
    "succeeded",
    "failed",
    "timed_out",
    "cancelled",
    "unknown",
    "skipped",
] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

export const AUTOMATION_DISPATCH_STATUSES = [
    "pending",
    "leased",
    "sent",
    "failed",
    "unknown",
    "dismissed",
] as const;
export type AutomationDispatchStatus = (typeof AUTOMATION_DISPATCH_STATUSES)[number];

export type MissedRunPolicy = "fire_once" | "skip" | "catch_up";
export type OverlapPolicy = "skip" | "queue_one" | "allow";

export interface AtSchedule {
    kind: "at";
    at: string;
}

export interface EverySchedule {
    kind: "every";
    intervalSeconds: number;
    anchorAt: string;
    timezone?: string;
}

export interface CronSchedule {
    kind: "cron";
    expression: string;
    timezone: string;
}

export type AutomationSchedule = AtSchedule | EverySchedule | CronSchedule;

export interface AutomationDeliveryTarget {
    channel: string;
    accountId: string;
    tenantId?: string;
    targetType: "chat" | "user";
    targetId: string;
    mentionAll?: boolean;
    failureTargetId?: string;
}

export interface UnattendedToolPolicy {
    allowedTools: string[];
    deniedTools: string[];
    allowExternalSideEffects: boolean;
    approvalTimeoutSeconds: number;
}

export interface AutomationRetryPolicy {
    maxAttempts: number;
    backoffSeconds: number;
}

export const DEFAULT_UNATTENDED_TOOL_POLICY: UnattendedToolPolicy = {
    allowedTools: [],
    deniedTools: ["shell", "code", "browser", "approval", "external_side_effect"],
    allowExternalSideEffects: false,
    approvalTimeoutSeconds: 0,
};

export interface AutomationCommandContext {
    actorId: string;
    agentId?: string;
    tenantId?: string;
    channel: string;
    accountId: string;
    conversationId: string;
    eventId: string;
}

export interface AutomationCommand {
    operation: "create" | "list" | "pause" | "resume" | "run" | "cancel";
    taskId?: string;
    idempotencyKey: string;
    name?: string;
    agentId?: string;
    prompt?: string;
    schedule?: AutomationSchedule;
}

export interface DeliveryReceipt {
    status: "delivered" | "failed" | "unknown";
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
}

export interface AutomationChannelAdapter {
    readonly channel: string;
    sendText(
        target: AutomationDeliveryTarget,
        content: string,
        idempotencyKey: string,
    ): Promise<DeliveryReceipt>;
    replyToInteraction(
        context: AutomationCommandContext,
        content: string,
        idempotencyKey: string,
    ): Promise<DeliveryReceipt>;
    validateTarget(target: AutomationDeliveryTarget): Promise<void>;
}
