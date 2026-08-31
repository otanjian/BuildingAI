import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_datasets", comment: "Tenant-scoped evaluation datasets" })
@Index("idx_ai_evaluation_dataset_scope", ["tenantId", "projectId", "status"])
export class AiEvaluationDataset extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 160 }) name: string;
    @Column({ type: "text", nullable: true }) description: string | null;
    @Column({ type: "varchar", length: 24, default: "active" }) status: "active" | "archived";
    @Column({ type: "uuid", name: "created_by", nullable: true }) createdBy: string | null;
    @Column({ type: "jsonb", default: "{}" }) provenance: Record<string, unknown>;
}
