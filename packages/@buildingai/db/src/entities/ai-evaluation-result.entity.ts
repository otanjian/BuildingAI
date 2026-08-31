import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_results", comment: "Per-case evaluation evidence" })
@Index("uq_ai_evaluation_result_case", ["runId", "caseId"], { unique: true })
export class AiEvaluationResult extends BaseEntity {
    @Column({ type: "uuid", nullable: true, name: "tenant_id" }) tenantId: string | null;
    @Column({ type: "uuid", name: "run_id" }) runId: string;
    @Column({ type: "uuid", name: "case_id" }) caseId: string;
    @Column({ type: "varchar", length: 24 }) status: "passed" | "failed" | "error" | "skipped";
    @Column({ type: "jsonb", default: "{}" }) metrics: Record<string, number>;
    @Column({ type: "jsonb", default: "{}" }) safety: Record<string, unknown>;
    @Column({ type: "jsonb", default: "{}" }) evidence: Record<string, unknown>;
    @Column({ type: "integer", name: "latency_ms", nullable: true }) latencyMs: number | null;
    @Column({ type: "numeric", name: "cost_usd", nullable: true }) costUsd: string | null;
    @Column({ type: "text", nullable: true }) error: string | null;
}
