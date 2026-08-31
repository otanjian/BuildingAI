import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "tool_gateway_approvals", comment: "Tool Gateway approvals" })
@Index("idx_tool_gateway_approval_scope", ["tenantId", "status", "expiresAt"])
export class ToolApproval extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "uuid", name: "project_id", nullable: true })
    projectId: string | null;

    @Column({ type: "varchar", length: 120, name: "tool_id" })
    toolId: string;

    @Column({ type: "uuid", name: "requested_by", nullable: true })
    requestedBy: string | null;

    @Column({ type: "uuid", name: "decided_by", nullable: true })
    decidedBy: string | null;

    @Column({ type: "varchar", length: 24, default: "pending" })
    status: "pending" | "approved" | "rejected" | "expired";

    @Column({ type: "text", name: "parameter_digest" })
    parameterDigest: string;

    @Column({ type: "jsonb", name: "redacted_parameters", default: "{}" })
    redactedParameters: Record<string, unknown>;

    @Column({ type: "timestamptz", name: "expires_at" })
    expiresAt: Date;

    @Column({ type: "text", nullable: true })
    reason: string | null;
}
