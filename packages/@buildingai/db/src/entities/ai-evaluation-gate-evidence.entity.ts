import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_gate_evidence", comment: "Immutable production gate evidence" })
@Index("idx_ai_evaluation_gate_scope", ["tenantId", "runId", "gateName"])
export class AiEvaluationGateEvidence extends BaseEntity {
    @Column({ type: "uuid", name: "run_id" }) runId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 80, name: "gate_name" }) gateName: string;
    @Column({ type: "varchar", length: 16 }) status: "passed" | "blocked" | "exception";
    @Column({ type: "numeric", nullable: true }) observed: string | null;
    @Column({ type: "numeric", nullable: true }) threshold: string | null;
    @Column({ type: "jsonb", default: "{}" }) evidence: Record<string, unknown>;
    @Column({ type: "uuid", name: "exception_owner", nullable: true }) exceptionOwner: string | null;
    @Column({ type: "timestamptz", name: "exception_expires_at", nullable: true }) exceptionExpiresAt: Date | null;
}
