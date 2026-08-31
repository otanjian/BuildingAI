import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const OUTBOX_STATUSES = ["pending", "delivered", "failed", "quarantined"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

@AppEntity({ name: "audit_outbox", comment: "Reliable audit/telemetry delivery outbox" })
@Index("idx_audit_outbox_delivery", ["status", "nextAttemptAt"])
@Index("uq_audit_outbox_idempotency", ["tenantId", "idempotencyKey"], { unique: true })
export class AuditOutbox extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 48 }) topic: string;
    @Column({ type: "varchar", length: 120, name: "request_id" }) requestId: string;
    @Column({ type: "varchar", length: 120, name: "correlation_id" }) correlationId: string;
    @Column({ type: "varchar", length: 160, name: "idempotency_key" }) idempotencyKey: string;
    @Column({ type: "jsonb" }) payload: Record<string, unknown>;
    @Column({ type: "varchar", length: 24, default: "pending" }) status: OutboxStatus;
    @Column({ type: "integer", default: 0, name: "attempts_made" }) attemptsMade: number;
    @Column({ type: "timestamptz", nullable: true, name: "next_attempt_at" }) nextAttemptAt: Date | null;
    @Column({ type: "text", nullable: true, name: "last_error" }) lastError: string | null;
    @Column({ type: "varchar", length: 64, name: "payload_digest" }) payloadDigest: string;
}
