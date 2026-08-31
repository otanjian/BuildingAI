import { QueueService } from "@buildingai/core/modules";
import {
    DATASET_INGESTION_STAGES,
    DatasetsIngestionJob,
    type DatasetIngestionStage,
    DatasetsDeletionEvidence,
    DatasetsDocument,
    DatasetsSegments,
} from "@buildingai/db/entities";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";

export type EnqueueIngestionInput = {
    tenantId: string;
    projectId?: string | null;
    datasetId: string;
    documentId?: string | null;
    stage: DatasetIngestionStage;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
};

/** Persistent lifecycle/checkpoint facade for all RAG ingestion stages. */
@Injectable()
export class DatasetsIngestionService {
    constructor(
        @InjectRepository(DatasetsIngestionJob)
        private readonly jobs: Repository<DatasetsIngestionJob>,
        private readonly queue: QueueService,
        @InjectRepository(DatasetsDeletionEvidence)
        private readonly evidence: Repository<DatasetsDeletionEvidence>,
        @InjectRepository(DatasetsDocument)
        private readonly documents: Repository<DatasetsDocument>,
        @InjectRepository(DatasetsSegments)
        private readonly segments: Repository<DatasetsSegments>,
    ) {}

    async enqueue(input: EnqueueIngestionInput) {
        if (!DATASET_INGESTION_STAGES.includes(input.stage)) {
            throw new Error(`Unsupported ingestion stage: ${input.stage}`);
        }
        const key = input.idempotencyKey ?? `${input.datasetId}:${input.documentId ?? "dataset"}:${input.stage}`;
        const existing = await this.jobs.findOne({ where: { tenantId: input.tenantId, idempotencyKey: key } });
        if (existing) return existing;
        const entity = await this.jobs.save(this.jobs.create({
            tenantId: input.tenantId,
            projectId: input.projectId ?? null,
            datasetId: input.datasetId,
            documentId: input.documentId ?? null,
            stage: input.stage,
            status: "queued",
            progress: 0,
            attemptsMade: 0,
            maxAttempts: 3,
            nextAttemptAt: null,
            checkpoint: null,
            errorMessage: null,
            idempotencyKey: key,
            metadata: input.metadata ?? null,
        }));
        await this.queue.addToQueue("vectorization", `${input.stage}_document`, {
            type: "ingestion",
            ingestionJobId: entity.id,
            params: { datasetId: input.datasetId, documentId: input.documentId },
        }, {
            jobId: `ingest-${entity.id}`,
            attempts: entity.maxAttempts,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: false,
            removeOnFail: false,
        });
        return entity;
    }

    async checkpoint(id: string, progress: number, checkpoint?: string | null) {
        const job = await this.jobs.findOne({ where: { id } });
        if (!job) throw new NotFoundException("Ingestion job not found");
        job.progress = Math.max(0, Math.min(100, Math.floor(progress)));
        if (checkpoint !== undefined) job.checkpoint = checkpoint;
        if (job.status === "queued") job.status = "running";
        return this.jobs.save(job);
    }

    async complete(id: string) {
        const job = await this.jobs.findOne({ where: { id } });
        if (!job) throw new NotFoundException("Ingestion job not found");
        job.status = "completed";
        job.progress = 100;
        const saved = await this.jobs.save(job);
        const nextStage: Partial<Record<DatasetIngestionStage, DatasetIngestionStage>> = {
            parse: "chunk",
            chunk: "embed",
            embed: "index",
        };
        const next = nextStage[job.stage];
        if (next) {
            await this.enqueue({
                tenantId: job.tenantId,
                projectId: job.projectId,
                datasetId: job.datasetId,
                documentId: job.documentId,
                stage: next,
                metadata: job.metadata ?? undefined,
            });
        }
        return saved;
    }

    async fail(id: string, error: unknown) {
        const job = await this.jobs.findOne({ where: { id } });
        if (!job) throw new NotFoundException("Ingestion job not found");
        job.attemptsMade += 1;
        job.errorMessage = error instanceof Error ? error.message : String(error);
        job.status = job.attemptsMade >= job.maxAttempts ? "dead_letter" : "failed";
        job.nextAttemptAt = job.status === "failed"
            ? new Date(Date.now() + 1000 * 2 ** Math.min(job.attemptsMade, 8))
            : null;
        return this.jobs.save(job);
    }

    async control(id: string, operation: "pause" | "resume" | "cancel" | "replay") {
        const job = await this.jobs.findOne({ where: { id } });
        if (!job) throw new NotFoundException("Ingestion job not found");
        if (operation === "pause") job.status = "paused";
        if (operation === "cancel") job.status = "cancelled";
        if (operation === "resume") {
            job.status = "queued";
            await this.queue.addToQueue("vectorization", `${job.stage}_document`, {
                type: "ingestion", ingestionJobId: job.id,
                params: { datasetId: job.datasetId, documentId: job.documentId },
            }, { jobId: `ingest-${job.id}:resume:${Date.now()}`, attempts: job.maxAttempts, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: false });
        }
        if (operation === "replay") {
            job.status = "queued";
            job.attemptsMade = 0;
            await this.queue.addToQueue("vectorization", `${job.stage}_document`, {
                type: "ingestion", ingestionJobId: job.id,
                params: { datasetId: job.datasetId, documentId: job.documentId },
            }, { jobId: `ingest-${job.id}:replay:${Date.now()}`, attempts: job.maxAttempts, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: false });
        }
        return this.jobs.save(job);
    }

    async listForDataset(tenantId: string, datasetId: string) {
        return this.jobs.find({ where: { tenantId, datasetId }, order: { createdAt: "DESC" } });
    }

    async get(id: string) {
        return this.jobs.findOne({ where: { id } });
    }

    async finalizeDeletion(id: string) {
        const job = await this.jobs.findOne({ where: { id } });
        if (!job || !job.documentId) return false;
        await this.segments.delete({ documentId: job.documentId });
        await this.documents.delete({ id: job.documentId });
        await this.evidence.update({ jobId: id }, { status: "completed", physicallyDeletedAt: new Date() });
        await this.complete(id);
        return true;
    }
}
