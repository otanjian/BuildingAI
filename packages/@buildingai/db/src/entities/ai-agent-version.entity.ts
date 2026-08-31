import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const AGENT_VERSION_STATUSES = ["draft", "submitted", "approved", "published", "paused", "archived"] as const;
export type AgentVersionStatus = (typeof AGENT_VERSION_STATUSES)[number];

@AppEntity({ name: "ai_agent_versions", comment: "Immutable Agent configuration versions" })
@Index("uq_ai_agent_version_number", ["agentId", "versionNumber"], { unique: true })
@Index("idx_ai_agent_version_scope", ["tenantId", "projectId", "agentId", "status"])
export class AiAgentVersion extends BaseEntity {
    @Column({ type: "uuid", name: "agent_id" }) agentId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "integer", name: "version_number" }) versionNumber: number;
    @Column({ type: "varchar", length: 120, nullable: true }) label: string | null;
    @Column({ type: "varchar", length: 24, default: "draft" }) status: AgentVersionStatus;
    @Column({ type: "jsonb", name: "snapshot" }) snapshot: Record<string, unknown>;
    @Column({ type: "varchar", length: 64, name: "config_hash" }) configHash: string;
    @Column({ type: "jsonb", name: "dependency_snapshot", default: "{}" }) dependencySnapshot: Record<string, unknown>;
    @Column({ type: "uuid", name: "created_by", nullable: true }) createdBy: string | null;
    @Column({ type: "text", name: "release_note", nullable: true }) releaseNote: string | null;
    @Column({ type: "uuid", name: "base_version_id", nullable: true }) baseVersionId: string | null;
    @Column({ type: "timestamptz", name: "submitted_at", nullable: true }) submittedAt: Date | null;
    @Column({ type: "timestamptz", name: "approved_at", nullable: true }) approvedAt: Date | null;
    @Column({ type: "timestamptz", name: "published_at", nullable: true }) publishedAt: Date | null;
}
