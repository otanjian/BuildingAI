import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_evaluators", comment: "Versioned evaluation definitions" })
@Index("uq_ai_evaluation_evaluator_version", ["tenantId", "name", "version"], { unique: true })
export class AiEvaluationEvaluator extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "varchar", length: 120 }) name: string;
    @Column({ type: "varchar", length: 64 }) version: string;
    @Column({ type: "varchar", length: 24 }) kind: "quality" | "safety" | "operational";
    @Column({ type: "jsonb", default: "{}" }) configuration: Record<string, unknown>;
    @Column({ type: "boolean", default: true }) enabled: boolean;
}
