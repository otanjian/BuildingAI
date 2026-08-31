import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "datasets_embeddings", comment: "知识库嵌入版本" })
@Index("idx_dataset_embeddings_scope", ["tenantId", "datasetId", "documentId", "segmentId"])
@Index("uq_dataset_embeddings_checksum", ["segmentId", "checksum", "modelVersion"], { unique: true })
export class DatasetsEmbedding extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "uuid", name: "dataset_id" })
    datasetId: string;

    @Column({ type: "uuid", name: "document_id" })
    documentId: string;

    @Column({ type: "uuid", name: "segment_id" })
    segmentId: string;

    @Column({ type: "varchar", length: 100, name: "model_version" })
    modelVersion: string;

    @Column({ type: "integer" })
    dimension: number;

    @Column({ type: "varchar", length: 128 })
    checksum: string;

    @Column({ type: "float", array: true })
    vector: number[];

    @Column({ type: "varchar", length: 32, default: "active" })
    status: "active" | "shadow" | "tombstoned";
}
