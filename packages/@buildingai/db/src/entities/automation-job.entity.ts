import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { SoftDeleteBaseEntity } from "./base";
import { ChannelAccount } from "./channel-account.entity";

export const AUTOMATION_JOB_STATUSES = ["active", "paused", "cancelled", "completed", "failed"] as const;
export type AutomationJobStatus = (typeof AUTOMATION_JOB_STATUSES)[number];

@AppEntity({ name: "automation_job", comment: "Durable agent automation" })
@Index("idx_automation_job_due", ["status", "nextRunAt"])
@Index("idx_automation_job_scope", ["creatorId", "channel", "conversationId", "status"])
@Index("idx_automation_job_account", ["channelAccountId", "status"])
@Index("idx_automation_job_tenant_project", ["tenantId", "projectId"])
@Index("uq_automation_job_create_idempotency", ["creatorId", "createIdempotencyKey"], {
    unique: true,
    where: '"create_idempotency_key" IS NOT NULL',
})
@Check("ck_automation_job_prompt", `LENGTH(TRIM("prompt")) BETWEEN 1 AND 12000`)
@Check("ck_automation_job_status", `"status" IN ('active', 'paused', 'cancelled', 'completed', 'failed')`)
@Check("ck_automation_job_schedule_kind", `"schedule_kind" IN ('at', 'every', 'cron')`)
export class AutomationJob extends SoftDeleteBaseEntity {
    @Column({ type: "varchar", length: 200 })
    name: string;

    @Column({ type: "varchar", length: 255, name: "agent_id" })
    agentId: string;

    @Column({ type: "text" })
    prompt: string;

    @Column({ type: "varchar", length: 16, name: "schedule_kind" })
    scheduleKind: "at" | "every" | "cron";

    @Column({ type: "jsonb" })
    schedule: Record<string, unknown>;

    @Column({ type: "varchar", length: 64, default: "UTC" })
    timezone: string;

    @Column({ type: "varchar", length: 64 })
    channel: string;

    @Column({ type: "uuid", name: "channel_account_id" })
    channelAccountId: string;

    @ManyToOne(() => ChannelAccount, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "channel_account_id" })
    channelAccount: Relation<ChannelAccount>;

    @Column({ type: "varchar", length: 255, name: "creator_id" })
    creatorId: string;

    @Column({ type: "varchar", length: 255, nullable: true, name: "tenant_id" })
    tenantId: string | null;

    @Column({ type: "uuid", nullable: true, name: "project_id" })
    projectId: string | null;

    @Column({ type: "varchar", length: 255, name: "conversation_id" })
    conversationId: string;

    @Column({ type: "jsonb", name: "delivery_target" })
    deliveryTarget: Record<string, unknown>;

    @Column({ type: "varchar", length: 32, default: "active" })
    status: AutomationJobStatus;

    @Column({ type: "timestamptz", name: "next_run_at" })
    nextRunAt: Date;

    @Column({ type: "timestamptz", nullable: true, name: "last_run_at" })
    lastRunAt: Date | null;

    @Column({ type: "varchar", length: 16, default: "fire_once", name: "missed_run_policy" })
    missedRunPolicy: "fire_once" | "skip" | "catch_up";

    @Column({ type: "varchar", length: 16, default: "skip", name: "overlap_policy" })
    overlapPolicy: "skip" | "queue_one" | "allow";

    @Column({ type: "integer", default: 900, name: "timeout_seconds" })
    timeoutSeconds: number;

    @Column({ type: "jsonb", default: "{}", name: "retry_policy" })
    retryPolicy: { maxAttempts: number; backoffSeconds: number };

    @Column({ type: "jsonb", default: "{}", name: "tool_policy" })
    toolPolicy: Record<string, unknown>;

    @Column({ type: "jsonb", default: "{}", name: "delivery_policy" })
    deliveryPolicy: Record<string, unknown>;

    @Column({ type: "boolean", default: false, name: "delete_after_run" })
    deleteAfterRun: boolean;

    @Column({ type: "varchar", length: 128, nullable: true, name: "create_idempotency_key" })
    createIdempotencyKey: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "retention_until" })
    retentionUntil: Date | null;
}
