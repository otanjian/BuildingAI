import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "datasets_deletion_evidence", comment: "知识库删除证明" })
@Index("idx_dataset_deletion_evidence_scope", ["tenantId", "datasetId", "documentId", "createdAt"])
export class DatasetsDeletionEvidence extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "uuid", name: "dataset_id" })
    datasetId: string;

    @Column({ type: "uuid", nullable: true, name: "document_id" })
    documentId: string | null;

    @Column({ type: "varchar", length: 64, name: "job_id" })
    jobId: string;

    @Column({ type: "varchar", length: 128, name: "content_digest" })
    contentDigest: string;

    @Column({ type: "timestamptz", name: "tombstoned_at" })
    tombstonedAt: Date;

    @Column({ type: "timestamptz", nullable: true, name: "physically_deleted_at" })
    physicallyDeletedAt: Date | null;

    @Column({ type: "varchar", length: 32, default: "pending" })
    status: "pending" | "completed" | "failed";
}
