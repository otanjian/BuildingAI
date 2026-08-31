import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_evaluation_dataset_versions", comment: "Immutable evaluation dataset snapshots" })
@Index("uq_ai_evaluation_dataset_version", ["datasetId", "versionNumber"], { unique: true })
export class AiEvaluationDatasetVersion extends BaseEntity {
    @Column({ type: "uuid", name: "dataset_id" }) datasetId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "integer", name: "version_number" }) versionNumber: number;
    @Column({ type: "varchar", length: 64, name: "snapshot_hash" }) snapshotHash: string;
    @Column({ type: "jsonb", name: "case_ids", default: "[]" }) caseIds: string[];
    @Column({ type: "jsonb", default: "{}" }) provenance: Record<string, unknown>;
    @Column({ type: "uuid", name: "created_by", nullable: true }) createdBy: string | null;
}
