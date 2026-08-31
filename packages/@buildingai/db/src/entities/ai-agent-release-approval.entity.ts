import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_agent_release_approvals", comment: "Agent release approvals" })
@Index("idx_ai_agent_release_approval_release", ["releaseId", "status"])
export class AiAgentReleaseApproval extends BaseEntity {
    @Column({ type: "uuid", name: "release_id" }) releaseId: string;
    @Column({ type: "uuid", name: "version_id" }) versionId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "varchar", length: 64, name: "gate_name" }) gateName: string;
    @Column({ type: "varchar", length: 24, default: "pending" }) status: "pending" | "approved" | "rejected" | "expired";
    @Column({ type: "uuid", name: "decided_by", nullable: true }) decidedBy: string | null;
    @Column({ type: "timestamptz", name: "decided_at", nullable: true }) decidedAt: Date | null;
    @Column({ type: "jsonb", name: "evidence", default: "{}" }) evidence: Record<string, unknown>;
    @Column({ type: "text", nullable: true }) reason: string | null;
}
