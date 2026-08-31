import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_cases", comment: "Sanitized evaluation cases" })
@Index("idx_ai_evaluation_case_scope", ["tenantId", "projectId", "datasetId", "sensitivity"])
export class AiEvaluationCase extends BaseEntity {
    @Column({ type: "uuid", name: "dataset_id" }) datasetId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 120, name: "external_key" }) externalKey: string;
    @Column({ type: "jsonb" }) input: Record<string, unknown>;
    @Column({ type: "jsonb", name: "expected_outcome", nullable: true }) expectedOutcome: Record<string, unknown> | null;
    @Column({ type: "jsonb", nullable: true }) rubric: Record<string, unknown> | null;
    @Column({ type: "varchar", length: 24, default: "internal" }) sensitivity: "public" | "internal" | "restricted";
    @Column({ type: "jsonb", name: "tool_expectations", default: "[]" }) toolExpectations: unknown[];
    @Column({ type: "jsonb", default: "{}" }) provenance: Record<string, unknown>;
    @Column({ type: "boolean", name: "is_active", default: true }) isActive: boolean;
}
