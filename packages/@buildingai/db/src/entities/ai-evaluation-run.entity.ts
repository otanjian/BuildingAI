import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const EVALUATION_RUN_STATUSES = ["queued", "running", "paused", "completed", "failed", "incomplete"] as const;
export type EvaluationRunStatus = (typeof EVALUATION_RUN_STATUSES)[number];

@AppEntity({ name: "ai_evaluation_runs", comment: "Reproducible Agent evaluation runs" })
@Index("idx_ai_evaluation_run_scope", ["tenantId", "projectId", "agentVersionId", "status"])
export class AiEvaluationRun extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "uuid", name: "dataset_version_id" }) datasetVersionId: string;
    @Column({ type: "uuid", name: "agent_version_id" }) agentVersionId: string;
    @Column({ type: "varchar", length: 64, name: "model_config_hash" }) modelConfigHash: string;
    @Column({ type: "varchar", length: 64, name: "retrieval_config_hash" }) retrievalConfigHash: string;
    @Column({ type: "varchar", length: 64, name: "tool_policy_hash" }) toolPolicyHash: string;
    @Column({ type: "varchar", length: 64, name: "evaluator_version" }) evaluatorVersion: string;
    @Column({ type: "integer" }) seed: number;
    @Column({ type: "jsonb", default: "{}" }) configuration: Record<string, unknown>;
    @Column({ type: "varchar", length: 24, default: "queued" }) status: EvaluationRunStatus;
    @Column({ type: "integer", name: "sample_count", default: 0 }) sampleCount: number;
    @Column({ type: "integer", name: "completed_count", default: 0 }) completedCount: number;
    @Column({ type: "integer", name: "error_count", default: 0 }) errorCount: number;
    @Column({ type: "uuid", name: "baseline_run_id", nullable: true }) baselineRunId: string | null;
    @Column({ type: "text", nullable: true }) failure: string | null;
}
