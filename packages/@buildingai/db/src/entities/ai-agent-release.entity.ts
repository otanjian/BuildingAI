import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const AGENT_RELEASE_ENVIRONMENTS = ["development", "test", "staging", "production"] as const;
export type AgentReleaseEnvironment = (typeof AGENT_RELEASE_ENVIRONMENTS)[number];
export const AGENT_RELEASE_STATUSES = ["pending", "canary", "active", "paused", "rolled_back", "archived"] as const;
export type AgentReleaseStatus = (typeof AGENT_RELEASE_STATUSES)[number];

@AppEntity({ name: "ai_agent_releases", comment: "Agent environment releases" })
@Index("idx_ai_agent_release_scope", ["tenantId", "projectId", "agentId", "environment", "status"])
@Index("uq_ai_agent_release_idempotency", ["tenantId", "idempotencyKey"], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class AiAgentRelease extends BaseEntity {
    @Column({ type: "uuid", name: "agent_id" }) agentId: string;
    @Column({ type: "uuid", name: "version_id" }) versionId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 24 }) environment: AgentReleaseEnvironment;
    @Column({ type: "varchar", length: 24, default: "pending" }) status: AgentReleaseStatus;
    @Column({ type: "integer", default: 0 }) revision: number;
    @Column({ type: "varchar", length: 120, name: "cohort_id", nullable: true }) cohortId: string | null;
    @Column({ type: "integer", name: "traffic_percent", default: 100 }) trafficPercent: number;
    @Column({ type: "uuid", name: "rollback_target_version_id", nullable: true }) rollbackTargetVersionId: string | null;
    @Column({ type: "uuid", name: "published_by", nullable: true }) publishedBy: string | null;
    @Column({ type: "text", name: "release_note", nullable: true }) releaseNote: string | null;
    @Column({ type: "jsonb", name: "evaluation_evidence", default: "{}" }) evaluationEvidence: Record<string, unknown>;
    @Column({ type: "varchar", length: 160, name: "idempotency_key", nullable: true }) idempotencyKey: string | null;
}
