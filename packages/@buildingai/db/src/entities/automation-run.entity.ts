import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { AutomationJob } from "./automation-job.entity";

export const AUTOMATION_RUN_STATUSES = [
    "pending", "queued", "running", "succeeded", "failed", "timed_out", "cancelled", "unknown", "skipped",
] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

@AppEntity({ name: "automation_run", comment: "Automation execution run" })
@Index("uq_automation_run_occurrence", ["jobId", "occurrenceKey"], { unique: true })
@Index("idx_automation_run_job_created", ["jobId", "createdAt"])
@Index("idx_automation_run_status", ["status", "createdAt"])
@Check("ck_automation_run_status", `"status" IN ('pending', 'queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled', 'unknown', 'skipped')`)
export class AutomationRun extends BaseEntity {
    @Column({ type: "uuid", name: "job_id" })
    jobId: string;

    @ManyToOne(() => AutomationJob, { onDelete: "CASCADE" })
    @JoinColumn({ name: "job_id" })
    job: Relation<AutomationJob>;

    @Column({ type: "varchar", length: 255, name: "occurrence_key" })
    occurrenceKey: string;

    @Column({ type: "varchar", length: 64, default: "scheduled" })
    trigger: "scheduled" | "manual" | "catch_up";

    @Column({ type: "varchar", length: 32, default: "pending" })
    status: AutomationRunStatus;

    @Column({ type: "timestamptz", name: "scheduled_at" })
    scheduledAt: Date;

    @Column({ type: "timestamptz", nullable: true, name: "started_at" })
    startedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "finished_at" })
    finishedAt: Date | null;

    @Column({ type: "integer", default: 0 })
    attempt: number;

    @Column({ type: "varchar", length: 255, nullable: true, name: "conversation_id" })
    conversationId: string | null;

    @Column({ type: "text", nullable: true, name: "result_preview" })
    resultPreview: string | null;

    @Column({ type: "text", nullable: true, name: "error_preview" })
    errorPreview: string | null;

    @Column({ type: "varchar", length: 32, default: "pending", name: "delivery_status" })
    deliveryStatus: "pending" | "delivered" | "failed" | "unknown" | "dismissed";

    @Column({ type: "varchar", length: 255, nullable: true, name: "provider_message_id" })
    providerMessageId: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "retention_until" })
    retentionUntil: Date | null;
}
