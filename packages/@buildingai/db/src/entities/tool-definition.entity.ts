import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const TOOL_RISKS = ["READ", "WRITE", "SENSITIVE", "DESTRUCTIVE"] as const;
export type ToolRisk = (typeof TOOL_RISKS)[number];
export const TOOL_STATUSES = ["active", "disabled", "draft"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

@AppEntity({ name: "tool_gateway_definitions", comment: "Tool Gateway registered tools" })
@Index("uq_tool_gateway_definition_version", ["tenantId", "name", "version"], { unique: true })
@Index("idx_tool_gateway_definition_scope", ["tenantId", "projectId", "agentVersionId", "status"])
export class ToolDefinition extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id", nullable: true })
    tenantId: string | null;

    @Column({ type: "uuid", name: "project_id", nullable: true })
    projectId: string | null;

    /** Agent release/version binding. A null value is a platform tool. */
    @Column({ type: "varchar", length: 120, name: "agent_version_id", nullable: true })
    agentVersionId: string | null;

    @Column({ type: "varchar", length: 120 })
    name: string;

    /** Optional deployment environment binding (development/staging/production). */
    @Column({ type: "varchar", length: 32, nullable: true })
    environment: string | null;

    @Column({ type: "varchar", length: 40, default: "1.0.0" })
    version: string;

    @Column({ type: "text", nullable: true })
    description: string | null;

    @Column({ type: "jsonb", default: "[]" })
    capabilities: string[];

    @Column({ type: "jsonb", name: "input_schema", default: "{}" })
    inputSchema: Record<string, unknown>;

    @Column({ type: "jsonb", name: "output_schema", default: "{}" })
    outputSchema: Record<string, unknown>;

    @Column({ type: "varchar", length: 20, default: "READ" })
    risk: ToolRisk;

    @Column({ type: "uuid", name: "credential_ref", nullable: true })
    credentialRef: string | null;

    @Column({ type: "integer", name: "timeout_ms", default: 15000 })
    timeoutMs: number;

    @Column({ type: "integer", name: "response_size_limit", default: 1048576 })
    responseSizeLimit: number;

    @Column({ type: "jsonb", name: "network_policy", default: "{}" })
    networkPolicy: Record<string, unknown>;

    @Column({ type: "boolean", name: "idempotency_required", default: false })
    idempotencyRequired: boolean;

    @Column({ type: "varchar", length: 24, name: "approval_mode", default: "none" })
    approvalMode: "none" | "preauthorization" | "approval" | "double_approval";

    @Column({ type: "integer", name: "max_concurrency", default: 4 })
    maxConcurrency: number;

    @Column({ type: "integer", name: "max_retries", default: 0 })
    maxRetries: number;

    /** Per-minute invocation budget; zero means platform default/no local cap. */
    @Column({ type: "integer", name: "budget_limit", default: 0 })
    budgetLimit: number;

    /** Per-minute rate limit; zero means unlimited by this tool definition. */
    @Column({ type: "integer", name: "rate_limit_per_minute", default: 0 })
    rateLimitPerMinute: number;

    @Column({ type: "varchar", length: 24, default: "active" })
    status: ToolStatus;

    @Column({ type: "integer", name: "policy_version", default: 1 })
    policyVersion: number;

    @Column({ type: "uuid", name: "created_by", nullable: true })
    createdBy: string | null;
}
