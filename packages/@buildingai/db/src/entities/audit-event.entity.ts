import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const AUDIT_OUTCOMES = ["allowed", "denied", "changed", "failed"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

@AppEntity({ name: "audit_events", comment: "Immutable enterprise audit events" })
@Index("idx_audit_events_scope_created", ["tenantId", "projectId", "createdAt"])
@Index("idx_audit_events_correlation", ["tenantId", "correlationId", "createdAt"])
export class AuditEvent extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", nullable: true, name: "project_id" }) projectId: string | null;
    @Column({ type: "uuid", nullable: true, name: "actor_id" }) actorId: string | null;
    @Column({ type: "uuid", nullable: true, name: "agent_id" }) agentId: string | null;
    @Column({ type: "varchar", length: 120, nullable: true, name: "agent_version_id" }) agentVersionId: string | null;
    @Column({ type: "varchar", length: 80 }) action: string;
    @Column({ type: "varchar", length: 24 }) outcome: AuditOutcome;
    @Column({ type: "varchar", length: 80, nullable: true, name: "resource_type" }) resourceType: string | null;
    @Column({ type: "varchar", length: 160, nullable: true, name: "resource_id" }) resourceId: string | null;
    @Column({ type: "varchar", length: 120, name: "request_id" }) requestId: string;
    @Column({ type: "varchar", length: 120, name: "correlation_id" }) correlationId: string;
    @Column({ type: "varchar", length: 120, nullable: true, name: "trace_id" }) traceId: string | null;
    @Column({ type: "varchar", length: 64, nullable: true, name: "policy_version" }) policyVersion: string | null;
    @Column({ type: "integer", nullable: true, name: "latency_ms" }) latencyMs: number | null;
    @Column({ type: "jsonb", default: "{}" }) metadata: Record<string, unknown>;
    @Column({ type: "varchar", length: 64, name: "payload_digest" }) payloadDigest: string;
}
