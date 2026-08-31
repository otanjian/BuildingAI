import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const DATASET_INGESTION_STAGES = ["parse", "chunk", "embed", "index", "re_embed", "revoke", "delete"] as const;
export type DatasetIngestionStage = (typeof DATASET_INGESTION_STAGES)[number];
export const DATASET_INGESTION_STATUSES = ["queued", "running", "paused", "failed", "dead_letter", "completed", "cancelled"] as const;
export type DatasetIngestionStatus = (typeof DATASET_INGESTION_STATUSES)[number];

@AppEntity({ name: "datasets_ingestion_jobs", comment: "知识库异步摄取任务" })
@Index("idx_dataset_ingestion_scope", ["tenantId", "datasetId", "status", "createdAt"])
@Index("uq_dataset_ingestion_idempotency", ["tenantId", "idempotencyKey"], { unique: true })
@Check("ck_dataset_ingestion_progress", '"progress" >= 0 AND "progress" <= 100')
export class DatasetsIngestionJob extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "uuid", nullable: true, name: "project_id" })
    projectId: string | null;

    @Column({ type: "uuid", name: "dataset_id" })
    datasetId: string;

    @Column({ type: "uuid", nullable: true, name: "document_id" })
    documentId: string | null;

    @Column({ type: "varchar", length: 32 })
    stage: DatasetIngestionStage;

    @Column({ type: "varchar", length: 32, default: "queued" })
    status: DatasetIngestionStatus;

    @Column({ type: "integer", default: 0 })
    progress: number;

    @Column({ type: "integer", default: 0, name: "attempts_made" })
    attemptsMade: number;

    @Column({ type: "integer", default: 3, name: "max_attempts" })
    maxAttempts: number;

    @Column({ type: "timestamptz", nullable: true, name: "next_attempt_at" })
    nextAttemptAt: Date | null;

    @Column({ type: "varchar", length: 128, nullable: true, name: "checkpoint" })
    checkpoint: string | null;

    @Column({ type: "text", nullable: true, name: "error_message" })
    errorMessage: string | null;

    @Column({ type: "varchar", length: 160, name: "idempotency_key" })
    idempotencyKey: string;

    @Column({ type: "jsonb", nullable: true })
    metadata: Record<string, unknown> | null;
}
