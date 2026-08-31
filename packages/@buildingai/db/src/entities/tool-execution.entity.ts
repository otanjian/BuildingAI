import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "tool_gateway_executions", comment: "Tool Gateway redacted execution audit" })
@Index("idx_tool_gateway_execution_scope", ["tenantId", "createdAt"])
@Index("idx_tool_gateway_execution_idempotency", ["tenantId", "idempotencyKey"], { unique: true })
export class ToolExecution extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "uuid", name: "project_id", nullable: true })
    projectId: string | null;

    @Column({ type: "varchar", length: 120, name: "tool_id" })
    toolId: string;

    @Column({ type: "varchar", length: 120, name: "tool_name" })
    toolName: string;

    @Column({ type: "varchar", length: 40, name: "tool_version" })
    toolVersion: string;

    @Column({ type: "uuid", name: "actor_id", nullable: true })
    actorId: string | null;

    @Column({ type: "varchar", length: 20 })
    risk: string;

    @Column({ type: "varchar", length: 24 })
    outcome: "allowed" | "denied" | "pending" | "failed" | "replayed";

    @Column({ type: "varchar", length: 80, name: "denial_reason", nullable: true })
    denialReason: string | null;

    @Column({ type: "text", name: "parameter_digest" })
    parameterDigest: string;

    @Column({ type: "jsonb", name: "redacted_input", default: "{}" })
    redactedInput: Record<string, unknown>;

    @Column({ type: "jsonb", name: "redacted_output", default: "{}" })
    redactedOutput: Record<string, unknown>;

    @Column({ type: "integer", default: 1 })
    attempts: number;

    @Column({ type: "integer", name: "latency_ms", default: 0 })
    latencyMs: number;

    @Column({ type: "varchar", length: 120, name: "idempotency_key", nullable: true })
    idempotencyKey: string | null;

    @Column({ type: "varchar", length: 120, name: "policy_version" })
    policyVersion: string;
}
