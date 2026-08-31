import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "usage_events", comment: "Metered model/tool/storage usage" })
@Index("idx_usage_events_scope_created", ["tenantId", "projectId", "createdAt"])
@Index("uq_usage_events_idempotency", ["tenantId", "idempotencyKey"], { unique: true })
export class UsageEvent extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", nullable: true, name: "department_id" }) departmentId: string | null;
    @Column({ type: "uuid", nullable: true, name: "project_id" }) projectId: string | null;
    @Column({ type: "uuid", nullable: true, name: "agent_id" }) agentId: string | null;
    @Column({ type: "uuid", nullable: true, name: "actor_id" }) actorId: string | null;
    @Column({ type: "varchar", length: 64, name: "kind" }) kind: string;
    @Column({ type: "varchar", length: 120, nullable: true }) provider: string | null;
    @Column({ type: "varchar", length: 120, nullable: true, name: "model" }) model: string | null;
    @Column({ type: "bigint", default: 0, name: "input_tokens" }) inputTokens: number;
    @Column({ type: "bigint", default: 0, name: "output_tokens" }) outputTokens: number;
    @Column({ type: "bigint", default: 0, name: "duration_ms" }) durationMs: number;
    @Column({ type: "numeric", precision: 20, scale: 8, default: 0 }) quantity: string;
    @Column({ type: "numeric", precision: 20, scale: 8, default: 0 }) amount: string;
    @Column({ type: "varchar", length: 64, nullable: true, name: "price_version" }) priceVersion: string | null;
    @Column({ type: "varchar", length: 120, name: "request_id" }) requestId: string;
    @Column({ type: "varchar", length: 120, name: "correlation_id" }) correlationId: string;
    @Column({ type: "varchar", length: 160, name: "idempotency_key" }) idempotencyKey: string;
    @Column({ type: "jsonb", default: "{}" }) metadata: Record<string, unknown>;
}
