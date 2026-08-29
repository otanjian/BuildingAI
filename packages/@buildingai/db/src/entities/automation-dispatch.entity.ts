import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { AutomationJob } from "./automation-job.entity";
import { AutomationRun } from "./automation-run.entity";

export const AUTOMATION_DISPATCH_STATUSES = ["pending", "leased", "sent", "failed", "unknown", "dismissed"] as const;
export type AutomationDispatchStatus = (typeof AUTOMATION_DISPATCH_STATUSES)[number];

@AppEntity({ name: "automation_dispatch", comment: "Automation transactional outbox" })
@Index("uq_automation_dispatch_key", ["dispatchKey"], { unique: true })
@Index("idx_automation_dispatch_recovery", ["status", "leaseUntil", "nextAttemptAt"])
@Check("ck_automation_dispatch_status", `"status" IN ('pending', 'leased', 'sent', 'failed', 'unknown', 'dismissed')`)
export class AutomationDispatch extends BaseEntity {
    @Column({ type: "uuid", name: "job_id" })
    jobId: string;

    @ManyToOne(() => AutomationJob, { onDelete: "CASCADE" })
    @JoinColumn({ name: "job_id" })
    job: Relation<AutomationJob>;

    @Column({ type: "uuid", name: "run_id" })
    runId: string;

    @ManyToOne(() => AutomationRun, { onDelete: "CASCADE" })
    @JoinColumn({ name: "run_id" })
    run: Relation<AutomationRun>;

    @Column({ type: "varchar", length: 255, name: "dispatch_key" })
    dispatchKey: string;

    @Column({ type: "varchar", length: 64 })
    kind: "execute" | "deliver" | "failure";

    @Column({ type: "varchar", length: 32, default: "pending" })
    status: AutomationDispatchStatus;

    @Column({ type: "integer", default: 0 })
    attempts: number;

    @Column({ type: "timestamptz", nullable: true, name: "lease_until" })
    leaseUntil: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "next_attempt_at" })
    nextAttemptAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "sent_at" })
    sentAt: Date | null;

    @Column({ type: "text", nullable: true, name: "last_error" })
    lastError: string | null;

    @Column({ type: "jsonb", default: "{}", name: "payload" })
    payload: Record<string, unknown>;
}
