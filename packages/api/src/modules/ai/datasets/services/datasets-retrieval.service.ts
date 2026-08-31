import { getProviderForEmbedding, getProviderForRerank, rerankV3 } from "@buildingai/ai-sdk";
import { cosineSimilarity } from "@buildingai/ai-toolkit/utils";
import { PROCESSING_STATUS } from "@buildingai/constants/shared/datasets.constants";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, DatasetsSegments } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import type {
    RetrievalChunk,
    RetrievalConfig,
    RetrievalResult,
} from "@buildingai/types/ai/retrieval-config.interface";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { DatasetsConfigService } from "@modules/config/services/datasets-config.service";
import { Injectable, Logger } from "@nestjs/common";
import { embed } from "ai";

import { DATASETS_DEFAULT_CONSTANTS } from "../constants/datasets.constants";
import { DatasetsQueryPreprocessorService } from "./datasets-query-preprocessor.service";
import { IndexAdapter } from "./index-adapter";
import {
    buildCitation,
    buildRetrievalContext,
    redactQueryForTelemetry,
    type RetrievalContext,
} from "./tenant-aware-retrieval";

type Candidate = {
    chunk: RetrievalChunk;
    segmentId: string;
    documentId?: string;
    embedding?: number[];
    semanticScore?: number;
    fullTextScore?: number;
};

@Injectable()
export class DatasetsRetrievalService {
    private readonly logger = new Logger(DatasetsRetrievalService.name);

    constructor(
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(DatasetsSegments)
        private readonly segmentsRepository: Repository<DatasetsSegments>,
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly datasetsConfigService: DatasetsConfigService,
        private readonly queryPreprocessor: DatasetsQueryPreprocessorService,
        private readonly indexAdapter: IndexAdapter,
    ) {}

    async retrieve(
        datasetId: string,
        query: string,
        topK?: number,
        scoreThreshold?: number,
        context?: Partial<RetrievalContext>,
    ): Promise<RetrievalResult> {
        const startTime = Date.now();
        const q = String(query ?? "").trim();
        const retrievalContext = buildRetrievalContext({
            ...context,
            datasetIds: context?.datasetIds ?? [datasetId],
        });
        this.logger.debug(
            `Retrieve: tenant=${retrievalContext.tenantId}, dataset=${datasetId}, digest=${redactQueryForTelemetry(q).queryDigest}`,
        );
        if (!q) return { chunks: [], totalTime: Date.now() - startTime };

        const dataset = await this.datasetsRepository.findOne({
            where: { id: datasetId },
            select: [
                "id",
                "tenantId",
                "projectId",
                "embeddingModelId",
                "retrievalMode",
                "retrievalConfig",
                "sourceVersion",
                "indexVersion",
                "indexStatus",
            ],
        });
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        if (dataset.tenantId !== retrievalContext.tenantId) {
            throw HttpErrorFactory.notFound("知识库不存在");
        }
        if (retrievalContext.projectId && dataset.projectId && dataset.projectId !== retrievalContext.projectId) {
            throw HttpErrorFactory.notFound("知识库不存在");
        }
        if (dataset.indexStatus === "unavailable" || dataset.indexStatus === "incompatible") {
            return { chunks: [], totalTime: Date.now() - startTime, status: "unavailable" } as RetrievalResult;
        }

        const defaultConfig = await this.datasetsConfigService.getDefaultRetrievalConfig();
        const config = this.mergeConfig(defaultConfig, dataset.retrievalConfig);
        const mode = this.resolveMode(config.retrievalMode ?? dataset.retrievalMode);
        const k = Math.max(
            1,
            Math.floor(topK ?? config.topK ?? DATASETS_DEFAULT_CONSTANTS.DEFAULT_TOP_K),
        );
        const threshold = config.scoreThresholdEnabled
            ? (scoreThreshold ?? config.scoreThreshold)
            : undefined;
        const preK = Math.min(50, Math.max(k * 4, k));

        const semanticRequired = mode === "vector" || mode === "hybrid";
        const fullTextRequired = mode === "fullText" || mode === "hybrid";
        const keywordRequired = mode === "keyword";

        const queryEmbedding = semanticRequired ? await this.embedQueryOrNull(dataset, q) : null;

        const [semantic, fullText, keyword] = await Promise.all([
            semanticRequired && queryEmbedding
                ? this.semanticSearch(datasetId, queryEmbedding, preK, retrievalContext, dataset.indexVersion ?? undefined, dataset.sourceVersion)
                : [],
            fullTextRequired ? this.fullTextSearch(datasetId, q, preK, retrievalContext, dataset.sourceVersion) : [],
            keywordRequired ? this.keywordSearch(datasetId, q, preK, retrievalContext, dataset.sourceVersion) : [],
        ]);

        if (mode === "vector") {
            const base = this.applyThreshold(this.deduplicate(semantic), threshold);
            const reranked = await this.maybeRerank(q, base, config, k);
            return {
                chunks: reranked.slice(0, k).map((c) => c.chunk),
                totalTime: Date.now() - startTime,
            };
        }

        if (mode === "fullText") {
            const base = this.applyThreshold(this.deduplicate(fullText), threshold);
            const reranked = await this.maybeRerank(q, base, config, k);
            return {
                chunks: reranked.slice(0, k).map((c) => c.chunk),
                totalTime: Date.now() - startTime,
            };
        }

        if (mode === "keyword") {
            const base = this.applyThreshold(this.deduplicate(keyword), threshold);
            const reranked = await this.maybeRerank(q, base, config, k);
            return {
                chunks: reranked.slice(0, k).map((c) => c.chunk),
                totalTime: Date.now() - startTime,
            };
        }

        const merged = this.deduplicate([...semantic, ...fullText]);
        if (merged.length === 0) return { chunks: [], totalTime: Date.now() - startTime };

        const scored =
            config.strategy === "rerank"
                ? await this.maybeRerank(q, merged, config, k)
                : this.weightedScore(q, merged, queryEmbedding, config);

        const final = this.applyThreshold(scored, threshold)
            .slice(0, k)
            .map((c) => c.chunk);
        return { chunks: final, totalTime: Date.now() - startTime };
    }

    private resolveMode(mode: string): "vector" | "fullText" | "hybrid" | "keyword" {
        const m = String(mode ?? "").trim();
        if (!m) return "hybrid";
        if (m === "vector" || m === "fullText" || m === "hybrid" || m === "keyword") return m;
        if (m === "semantic_search") return "vector";
        if (m === "full_text_search") return "fullText";
        if (m === "hybrid_search") return "hybrid";
        if (m === "keyword_search") return "keyword";
        return "hybrid";
    }

    private mergeConfig(
        base: RetrievalConfig,
        override: RetrievalConfig | undefined | null,
    ): RetrievalConfig {
        const D = DATASETS_DEFAULT_CONSTANTS;
        const o = override && typeof override === "object" ? override : ({} as RetrievalConfig);
        return {
            retrievalMode: o.retrievalMode ?? base.retrievalMode ?? "hybrid",
            strategy: o.strategy ?? base.strategy ?? "weighted_score",
            topK: o.topK ?? base.topK ?? D.DEFAULT_TOP_K,
            scoreThreshold: o.scoreThreshold ?? base.scoreThreshold ?? D.DEFAULT_SCORE_THRESHOLD,
            scoreThresholdEnabled: o.scoreThresholdEnabled ?? base.scoreThresholdEnabled ?? false,
            weightConfig: {
                semanticWeight:
                    o.weightConfig?.semanticWeight ??
                    base.weightConfig?.semanticWeight ??
                    D.DEFAULT_SEMANTIC_WEIGHT,
                keywordWeight:
                    o.weightConfig?.keywordWeight ??
                    base.weightConfig?.keywordWeight ??
                    D.DEFAULT_KEYWORD_WEIGHT,
            },
            rerankConfig: {
                enabled: o.rerankConfig?.enabled ?? base.rerankConfig?.enabled ?? false,
                modelId: o.rerankConfig?.modelId ?? base.rerankConfig?.modelId ?? "",
            },
        };
    }

    private async embedQueryOrNull(dataset: Datasets, query: string): Promise<number[] | null> {
        const embeddingModelId = dataset.embeddingModelId;
        if (!embeddingModelId) return null;

        const model = await this.aiModelService.findOne({
            where: { id: embeddingModelId, isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) return null;

        try {
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId!,
            );
            const provider = getProviderForEmbedding(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });
            const embeddingModel = provider(model.model);
            const input = query.replaceAll("\n", " ").trim() || " ";
            const result = await embed({ model: embeddingModel.model, value: input });
            return result.embedding;
        } catch (err) {
            this.logger.warn(
                `Embed query failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            return null;
        }
    }

    private async semanticSearch(
        datasetId: string,
        queryEmbedding: number[],
        topK: number,
        context: RetrievalContext,
        indexVersion?: string,
        sourceVersion?: number,
    ): Promise<Candidate[]> {
        const scored: Candidate[] = [];
        const segments = await this.indexAdapter.search({ datasetId, tenantId: context.tenantId, projectId: context.projectId, queryEmbedding, topK, indexVersion, sourceVersion, timeoutMs: context.limits.timeoutMs });
        for (const s of segments) {
            if (!Array.isArray(s.embedding) || s.embedding.length === 0) continue;
            const semanticScore = Number.isFinite(s.score) ? s.score : cosineSimilarity(queryEmbedding, s.embedding);
            scored.push({
                segmentId: s.id,
                documentId: s.documentId,
                embedding: s.embedding,
                semanticScore,
                chunk: {
                    id: s.id,
                    content: s.content,
                    score: semanticScore,
                    chunkIndex: s.chunkIndex,
                    contentLength: s.contentLength,
                    fileName: s.fileName ?? undefined,
                    citation: buildCitation({ tenantId: context.tenantId, projectId: context.projectId, datasetId, documentId: s.documentId, segmentId: s.id, sourceVersion: s.sourceVersion, chunkIndex: s.chunkIndex, fileName: s.fileName ?? undefined }),
                    metadata: { fileType: s.fileType ?? undefined, fileUrl: s.fileUrl ?? undefined },
                },
            });
        }

        scored.sort((a, b) => (b.chunk.score ?? 0) - (a.chunk.score ?? 0));
        return scored.slice(0, topK);
    }

    private async fullTextSearch(
        datasetId: string,
        query: string,
        topK: number,
        context: RetrievalContext,
        sourceVersion?: number,
    ): Promise<Candidate[]> {
        const preprocessed = this.queryPreprocessor.segmentForFullTextSearch(query, 5);
        if (!preprocessed) return [];

        const headlineOpts =
            "StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=5, MaxWords=25, FragmentDelimiter= … ";

        const rows = await this.tryTsFullTextSearch({
            datasetId,
            query: this.queryPreprocessor.escapeQueryForSearch(query),
            topK,
            headlineOpts,
            context,
            sourceVersion,
        });

        if (rows.length > 0) {
            return rows.map((r) => {
                const fullTextScore = Number(r.score ?? 0) || 0;
                return {
                    segmentId: r.segment_id,
                    documentId: r.document_id,
                    embedding: Array.isArray(r.embedding) ? r.embedding : undefined,
                    fullTextScore,
                    chunk: {
                        id: r.segment_id,
                        content: r.content ?? "",
                        score: fullTextScore,
                        chunkIndex: r.chunk_index ?? undefined,
                        contentLength: r.content_length ?? undefined,
                        fileName: r.file_name ?? undefined,
                        citation: buildCitation({ tenantId: context.tenantId, projectId: context.projectId, datasetId, documentId: r.document_id, segmentId: r.segment_id, sourceVersion: sourceVersion ?? 1, chunkIndex: r.chunk_index ?? undefined, fileName: r.file_name ?? undefined }),
                        highlight: r.highlight ?? undefined,
                        metadata: {
                            fileType: r.file_type ?? undefined,
                            fileUrl: r.file_url ?? undefined,
                        },
                    },
                };
            });
        }

        const tokens = Array.from(
            new Set(
                preprocessed
                    .split(/\s+/)
                    .map((t) => t.trim())
                    .filter(Boolean),
            ),
        ).slice(0, 8);
        if (tokens.length === 0) return [];

        const expr = tokens
            .map((_, i) => `CASE WHEN s.content ILIKE :p${i} THEN 1 ELSE 0 END`)
            .join(" + ");
        const orExpr = tokens.map((_, i) => `s.content ILIKE :p${i}`).join(" OR ");

        const qb2 = this.segmentsRepository
            .createQueryBuilder("s")
            .innerJoin("s.document", "d")
            .where("s.dataset_id = :datasetId", { datasetId })
            .andWhere("s.status = :status", { status: PROCESSING_STATUS.COMPLETED })
            .andWhere("s.enabled = 1")
            .andWhere(`(${orExpr})`)
            .select([
                "s.id AS segment_id",
                "s.document_id AS document_id",
                "s.content AS content",
                "s.chunk_index AS chunk_index",
                "s.content_length AS content_length",
                "s.embedding AS embedding",
                "d.file_name AS file_name",
                "d.file_type AS file_type",
                "d.file_url AS file_url",
            ])
            .addSelect(`(${expr})`, "score")
            .orderBy("score", "DESC")
            .limit(topK);

        for (let i = 0; i < tokens.length; i++) {
            qb2.setParameter(`p${i}`, `%${tokens[i]}%`);
        }

        const rows2 = (await qb2.getRawMany()) as Array<{
            segment_id: string;
            document_id: string;
            content: string;
            chunk_index: number | null;
            content_length: number | null;
            embedding: number[] | null;
            file_name: string | null;
            file_type: string | null;
            file_url: string | null;
            score: string | number | null;
        }>;

        return rows2
            .map((r) => {
                const fullTextScore = Number(r.score ?? 0) || 0;
                const content = r.content ?? "";
                return {
                    segmentId: r.segment_id,
                    documentId: r.document_id,
                    embedding: Array.isArray(r.embedding) ? r.embedding : undefined,
                    fullTextScore,
                    chunk: {
                        id: r.segment_id,
                        content,
                        score: fullTextScore,
                        chunkIndex: r.chunk_index ?? undefined,
                        contentLength: r.content_length ?? undefined,
                        fileName: r.file_name ?? undefined,
                        highlight: this.highlightContent(content, tokens),
                        citation: buildCitation({ tenantId: context.tenantId, projectId: context.projectId, datasetId, documentId: r.document_id, segmentId: r.segment_id, sourceVersion: sourceVersion ?? 1, chunkIndex: r.chunk_index ?? undefined, fileName: r.file_name ?? undefined }),
                        metadata: {
                            fileType: r.file_type ?? undefined,
                            fileUrl: r.file_url ?? undefined,
                        },
                    },
                } satisfies Candidate;
            })
            .filter((x) => (x.chunk.score ?? 0) > 0);
    }

    private async tryTsFullTextSearch(args: {
        datasetId: string;
        query: string;
        topK: number;
        headlineOpts: string;
        context: RetrievalContext;
        sourceVersion?: number;
    }): Promise<
        Array<{
            segment_id: string;
            document_id: string;
            content: string;
            chunk_index: number | null;
            content_length: number | null;
            embedding: number[] | null;
            file_name: string | null;
            file_type: string | null;
            file_url: string | null;
            score: string | number | null;
            highlight: string | null;
        }>
    > {
        const createBaseQuery = () =>
            this.segmentsRepository
                .createQueryBuilder("s")
                .innerJoin("s.document", "d")
                .where("s.dataset_id = :datasetId", { datasetId: args.datasetId })
                .andWhere("s.tenant_id = :tenantId", { tenantId: args.context.tenantId })
                .andWhere("(s.project_id IS NULL OR s.project_id = :projectId)", { projectId: args.context.projectId ?? null })
                .andWhere("s.status = :status", { status: PROCESSING_STATUS.COMPLETED })
                .andWhere("s.enabled = 1")
                .andWhere("s.index_status = 'active'")
                .andWhere("s.source_version = :sourceVersion", { sourceVersion: args.sourceVersion ?? 1 })
                .andWhere("d.revoked_at IS NULL")
                .andWhere("(d.acl_policy IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(d.acl_policy->'denyUserIds', '[]'::jsonb)) acl WHERE acl.value = :actorId))", { actorId: args.context.actorId })
                .andWhere("(d.acl_policy IS NULL OR d.acl_policy->'allowUserIds' IS NULL OR jsonb_array_length(d.acl_policy->'allowUserIds') = 0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(d.acl_policy->'allowUserIds') acl WHERE acl.value = :actorId))", { actorId: args.context.actorId })
                .select([
                    "s.id AS segment_id",
                    "s.document_id AS document_id",
                    "s.content AS content",
                    "s.chunk_index AS chunk_index",
                    "s.content_length AS content_length",
                    "s.embedding AS embedding",
                    "d.file_name AS file_name",
                    "d.file_type AS file_type",
                    "d.file_url AS file_url",
                ])
                .setParameter("q", args.query)
                .setParameter("opts", args.headlineOpts)
                .limit(args.topK);

        const zhCfg = "chinese_zh";
        try {
            const qb = createBaseQuery()
                .andWhere(
                    `to_tsvector('${zhCfg}', s.content) @@ websearch_to_tsquery('${zhCfg}', :q)`,
                )
                .addSelect(
                    `ts_rank_cd(to_tsvector('${zhCfg}', s.content), websearch_to_tsquery('${zhCfg}', :q))`,
                    "score",
                )
                .addSelect(
                    `ts_headline('${zhCfg}', s.content, websearch_to_tsquery('${zhCfg}', :q), :opts)`,
                    "highlight",
                )
                .orderBy("score", "DESC");
            return (await qb.getRawMany()) as any;
        } catch (err) {
            this.logger.warn(
                `zhparser fulltext unavailable: ${err instanceof Error ? err.message : String(err)}`,
            );
        }

        try {
            const qb = createBaseQuery()
                .andWhere("to_tsvector('simple', s.content) @@ websearch_to_tsquery('simple', :q)")
                .addSelect(
                    "ts_rank_cd(to_tsvector('simple', s.content), websearch_to_tsquery('simple', :q))",
                    "score",
                )
                .addSelect(
                    "ts_headline('simple', s.content, websearch_to_tsquery('simple', :q), :opts)",
                    "highlight",
                )
                .orderBy("score", "DESC");
            return (await qb.getRawMany()) as any;
        } catch (err) {
            this.logger.warn(
                `fulltext websearch unavailable: ${err instanceof Error ? err.message : String(err)}`,
            );
        }

        const qb = createBaseQuery()
            .andWhere("to_tsvector('simple', s.content) @@ plainto_tsquery('simple', :q)")
            .addSelect(
                "ts_rank(to_tsvector('simple', s.content), plainto_tsquery('simple', :q))",
                "score",
            )
            .addSelect(
                "ts_headline('simple', s.content, plainto_tsquery('simple', :q), :opts)",
                "highlight",
            )
            .orderBy("score", "DESC");
        return (await qb.getRawMany()) as any;
    }

    private highlightContent(content: string, tokens: string[]): string | undefined {
        const unique = Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
        if (unique.length === 0) return undefined;
        const ordered = unique.sort((a, b) => b.length - a.length).slice(0, 20);
        const escaped = ordered.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const re = new RegExp(escaped.join("|"), "gi");
        const marked = content.replace(re, (m) => `<mark>${m}</mark>`);
        return marked === content ? undefined : marked;
    }

    private async keywordSearch(
        datasetId: string,
        query: string,
        topK: number,
        context: RetrievalContext,
        sourceVersion?: number,
    ): Promise<Candidate[]> {
        const tokens = this.queryPreprocessor
            .tokenize(query)
            .map((t) => t.trim())
            .filter(Boolean);
        const unique = Array.from(new Set(tokens)).slice(0, 8);
        if (unique.length === 0) return [];

        const expr = unique
            .map((_, i) => `CASE WHEN s.content ILIKE :p${i} THEN 1 ELSE 0 END`)
            .join(" + ");

        const qb = this.segmentsRepository
            .createQueryBuilder("s")
            .innerJoin("s.document", "d")
            .where("s.dataset_id = :datasetId", { datasetId })
            .andWhere("s.tenant_id = :tenantId", { tenantId: context.tenantId })
            .andWhere("(s.project_id IS NULL OR s.project_id = :projectId)", { projectId: context.projectId ?? null })
            .andWhere("s.status = :status", { status: PROCESSING_STATUS.COMPLETED })
            .andWhere("s.enabled = 1")
            .andWhere("s.index_status = 'active'")
            .andWhere("s.source_version = :sourceVersion", { sourceVersion: sourceVersion ?? 1 })
            .andWhere("d.revoked_at IS NULL")
            .andWhere("(d.acl_policy IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(d.acl_policy->'denyUserIds', '[]'::jsonb)) acl WHERE acl.value = :actorId))")
            .andWhere("(d.acl_policy IS NULL OR d.acl_policy->'allowUserIds' IS NULL OR jsonb_array_length(d.acl_policy->'allowUserIds') = 0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(d.acl_policy->'allowUserIds') acl WHERE acl.value = :actorId))")
            .select([
                "s.id AS segment_id",
                "s.document_id AS document_id",
                "s.content AS content",
                "s.chunk_index AS chunk_index",
                "s.content_length AS content_length",
                "s.embedding AS embedding",
                "d.file_name AS file_name",
                "d.file_type AS file_type",
                "d.file_url AS file_url",
            ])
            .addSelect(`(${expr})`, "score")
            .orderBy("score", "DESC")
            .limit(topK);

        for (let i = 0; i < unique.length; i++) {
            qb.setParameter(`p${i}`, `%${unique[i]}%`);
        }
        qb.setParameter("actorId", context.actorId);

        const rows = (await qb.getRawMany()) as Array<{
            segment_id: string;
            document_id: string;
            content: string;
            chunk_index: number | null;
            content_length: number | null;
            embedding: number[] | null;
            file_name: string | null;
            file_type: string | null;
            file_url: string | null;
            score: string | number | null;
        }>;

        return rows
            .map((r) => {
                const s = Number(r.score ?? 0) || 0;
                return {
                    segmentId: r.segment_id,
                    documentId: r.document_id,
                    embedding: Array.isArray(r.embedding) ? r.embedding : undefined,
                    chunk: {
                        id: r.segment_id,
                        content: r.content ?? "",
                        score: s,
                        chunkIndex: r.chunk_index ?? undefined,
                        contentLength: r.content_length ?? undefined,
                        fileName: r.file_name ?? undefined,
                        citation: buildCitation({ tenantId: context.tenantId, projectId: context.projectId, datasetId, documentId: r.document_id, segmentId: r.segment_id, sourceVersion: sourceVersion ?? 1, chunkIndex: r.chunk_index ?? undefined, fileName: r.file_name ?? undefined }),
                        metadata: {
                            fileType: r.file_type ?? undefined,
                            fileUrl: r.file_url ?? undefined,
                        },
                    },
                } satisfies Candidate;
            })
            .filter((x) => (x.chunk.score ?? 0) > 0);
    }

    private deduplicate(items: Candidate[]): Candidate[] {
        const seen = new Map<string, Candidate>();
        const order: string[] = [];
        for (const item of items) {
            const key = item.segmentId || item.chunk.id;
            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, item);
                order.push(key);
                continue;
            }
            const a = existing.chunk.score ?? 0;
            const b = item.chunk.score ?? 0;
            if (b > a) seen.set(key, item);
        }
        return order.map((k) => seen.get(k)!).filter(Boolean);
    }

    private applyThreshold(items: Candidate[], threshold?: number): Candidate[] {
        if (threshold == null) return items;
        const t = Number(threshold);
        if (!Number.isFinite(t)) return items;
        return items.filter((x) => (x.chunk.score ?? 0) >= t);
    }

    private weightedScore(
        query: string,
        items: Candidate[],
        queryEmbedding: number[] | null,
        config: RetrievalConfig,
    ): Candidate[] {
        const semanticWeight = Number(config.weightConfig?.semanticWeight ?? 0);
        const keywordWeight = Number(config.weightConfig?.keywordWeight ?? 0);

        let sw = Number.isFinite(semanticWeight) ? semanticWeight : 0;
        let kw = Number.isFinite(keywordWeight) ? keywordWeight : 0;
        if (sw === 0 && kw === 0) sw = 1;

        const queryTokens = this.queryPreprocessor.tokenize(query);
        const docTokens = items.map((x) => this.queryPreprocessor.tokenize(x.chunk.content));
        const keywordScores = this.computeTfIdfCosineScores(queryTokens, docTokens);

        const out = items.map((x, i) => {
            const semantic =
                x.semanticScore ??
                (queryEmbedding && x.embedding ? cosineSimilarity(queryEmbedding, x.embedding) : 0);
            const keyword = keywordScores[i] ?? 0;
            const score = sw * semantic + kw * keyword;
            return {
                ...x,
                semanticScore: semantic,
                chunk: { ...x.chunk, score },
            };
        });

        out.sort((a, b) => (b.chunk.score ?? 0) - (a.chunk.score ?? 0));
        return out;
    }

    private computeTfIdfCosineScores(queryTokens: string[], docsTokens: string[][]): number[] {
        const N = docsTokens.length;
        if (N === 0) return [];

        const df = new Map<string, number>();
        const docTfs = docsTokens.map((tokens) => {
            const tf = new Map<string, number>();
            for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
            for (const tok of new Set(tokens)) df.set(tok, (df.get(tok) ?? 0) + 1);
            return tf;
        });

        const qtf = new Map<string, number>();
        for (const tok of queryTokens) qtf.set(tok, (qtf.get(tok) ?? 0) + 1);

        const idf = (term: string) => Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1;

        const qWeights = new Map<string, number>();
        let qNorm = 0;
        for (const [term, tf] of qtf) {
            const w = tf * idf(term);
            qWeights.set(term, w);
            qNorm += w * w;
        }
        qNorm = Math.sqrt(qNorm);
        if (qNorm === 0) return Array.from({ length: N }, () => 0);

        return docTfs.map((tf) => {
            let dot = 0;
            let dNorm = 0;
            for (const [term, dtf] of tf) {
                const w = dtf * idf(term);
                dNorm += w * w;
                const qw = qWeights.get(term);
                if (qw) dot += qw * w;
            }
            dNorm = Math.sqrt(dNorm);
            if (dNorm === 0) return 0;
            return dot / (qNorm * dNorm);
        });
    }

    private async maybeRerank(
        query: string,
        items: Candidate[],
        config: RetrievalConfig,
        topK: number,
    ): Promise<Candidate[]> {
        const modelId = config.rerankConfig?.enabled
            ? String(config.rerankConfig?.modelId ?? "")
            : "";
        if (!modelId.trim()) {
            return items.sort((a, b) => (b.chunk.score ?? 0) - (a.chunk.score ?? 0));
        }

        const model = await this.aiModelService.findOne({
            where: { id: modelId.trim(), isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) return items;

        try {
            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId!,
            );
            const provider = getProviderForRerank(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });
            const rerankModel = provider(model.model).model;
            const docs = items.map((x) => x.chunk.content);
            const result = await rerankV3({
                model: rerankModel,
                query,
                documents: docs,
                topN: Math.min(Math.max(1, topK), docs.length),
            });
            const ranked = result.ranking
                .map((r) => {
                    const item = items[r.originalIndex];
                    if (!item) return null;
                    return { ...item, chunk: { ...item.chunk, score: r.score } };
                })
                .filter(Boolean) as Candidate[];
            return ranked.length ? ranked : items;
        } catch (err) {
            this.logger.warn(`Rerank failed: ${err instanceof Error ? err.message : String(err)}`);
            return items;
        }
    }
}
