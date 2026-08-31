import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const EVALUATION_FEEDBACK_SOURCES = ["production_failure", "user_feedback", "incident", "tool_policy"] as const;
export type EvaluationFeedbackSource = (typeof EVALUATION_FEEDBACK_SOURCES)[number];
export const EVALUATION_FEEDBACK_STATES = ["new", "triaged", "promoted", "rejected"] as const;
export type EvaluationFeedbackState = (typeof EVALUATION_FEEDBACK_STATES)[number];

@AppEntity({ name: "ai_evaluation_feedback", comment: "Sanitized production signals for regression cases" })
@Index("idx_ai_evaluation_feedback_scope", ["tenantId", "projectId", "state", "createdAt"])
export class AiEvaluationFeedback extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 24, name: "source_type" }) sourceType: EvaluationFeedbackSource;
    @Column({ type: "varchar", length: 160, name: "source_id", nullable: true }) sourceId: string | null;
    @Column({ type: "varchar", length: 24, default: "new" }) state: EvaluationFeedbackState;
    @Column({ type: "varchar", length: 120, array: true, default: "{}" }) tags: string[];
    @Column({ type: "varchar", length: 24, default: "internal" }) sensitivity: "public" | "internal" | "restricted";
    @Column({ type: "text", name: "redacted_summary" }) redactedSummary: string;
    @Column({ type: "varchar", length: 64, name: "input_digest" }) inputDigest: string;
    @Column({ type: "jsonb", name: "expected_outcome", nullable: true }) expectedOutcome: Record<string, unknown> | null;
    @Column({ type: "jsonb", default: "{}" }) provenance: Record<string, unknown>;
    @Column({ type: "uuid", name: "promoted_case_id", nullable: true }) promotedCaseId: string | null;
    @Column({ type: "uuid", name: "created_by", nullable: true }) createdBy: string | null;
    @Column({ type: "uuid", name: "reviewed_by", nullable: true }) reviewedBy: string | null;
    @Column({ type: "timestamptz", name: "reviewed_at", nullable: true }) reviewedAt: Date | null;
}
