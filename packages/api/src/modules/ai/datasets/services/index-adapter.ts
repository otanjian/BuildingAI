import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsSegments } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

export type IndexedCandidate = {
    id: string;
    documentId: string;
    content: string;
    embedding: number[] | null;
    chunkIndex: number;
    contentLength: number;
    fileName?: string | null;
    fileType?: string | null;
    fileUrl?: string | null;
    sourceVersion: number;
    score: number;
};

export type IndexSearchInput = {
    datasetId: string;
    tenantId: string;
    projectId?: string;
    queryEmbedding: number[];
    topK: number;
    indexVersion?: string;
    sourceVersion?: number;
    timeoutMs?: number;
};

@Injectable()
export class IndexAdapter {
    private readonly logger = new Logger(IndexAdapter.name);
    private queries = 0;
    private unavailable = 0;

    constructor(
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
    ) {}

    async search(input: IndexSearchInput): Promise<IndexedCandidate[]> {
        const topK = Math.min(50, Math.max(1, Math.floor(input.topK)));
        this.queries++;
        const started = Date.now();
        const vector = `[${input.queryEmbedding.join(",")}]`;
        try {
            const qb = this.segmentsRepository
                .createQueryBuilder("s")
                .innerJoin("s.document", "d")
                .where("s.dataset_id = :datasetId", { datasetId: input.datasetId })
                .andWhere("s.tenant_id = :tenantId", { tenantId: input.tenantId })
                .andWhere("(s.project_id IS NULL OR s.project_id = :projectId)", { projectId: input.projectId ?? null })
                .andWhere("s.status = :status", { status: PROCESSING_STATUS.COMPLETED })
                .andWhere("s.enabled = 1 AND s.index_status = 'active'")
                .andWhere("s.embedding IS NOT NULL")
                .andWhere("d.revoked_at IS NULL")
                .andWhere(input.indexVersion ? "s.index_version = :indexVersion" : "1=1", { indexVersion: input.indexVersion })
                .andWhere(input.sourceVersion == null ? "1=1" : "s.source_version = :sourceVersion", { sourceVersion: input.sourceVersion })
                .select([
                    "s.id AS id", "s.document_id AS document_id", "s.content AS content",
                    "s.embedding AS embedding", "s.chunk_index AS chunk_index", "s.content_length AS content_length",
                    "s.source_version AS source_version", "d.file_name AS file_name", "d.file_type AS file_type", "d.file_url AS file_url",
                ])
                .addSelect("1 - (s.embedding::text::vector <=> CAST(:queryVector AS vector))", "score")
                .orderBy("score", "DESC")
                .limit(topK)
                .setParameter("queryVector", vector);
            const rows = await qb.getRawMany<any>();
            return rows.map((r) => ({ ...r, documentId: r.document_id, chunkIndex: Number(r.chunk_index), contentLength: Number(r.content_length), sourceVersion: Number(r.source_version), score: Number(r.score) }));
        } catch (error) {
            this.unavailable++;
            this.logger.warn(`pgvector index unavailable; bounded fallback used: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    metrics() {
        return { queries: this.queries, unavailable: this.unavailable };
    }
}
