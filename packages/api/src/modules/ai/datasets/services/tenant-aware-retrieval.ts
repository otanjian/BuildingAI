import { createHash } from "node:crypto";

export type RetrievalContext = {
    tenantId: string;
    projectId?: string;
    actorId: string;
    actorType?: "user" | "service";
    datasetIds: string[];
    readableDocumentIds?: string[];
    classifications?: string[];
    limits?: Partial<RetrievalLimits>;
    verified?: boolean;
};

export type RetrievalLimits = {
    topK: number;
    timeoutMs: number;
    maxResultBytes: number;
};

export type RetrievalCitation = {
    tenantId: string;
    projectId?: string;
    datasetId: string;
    documentId: string;
    segmentId: string;
    sourceVersion: number;
    chunkIndex?: number;
    fileName?: string;
    span?: { start: number; end: number };
};

const DEFAULT_LIMITS: RetrievalLimits = { topK: 8, timeoutMs: 2_000, maxResultBytes: 64 * 1024 };

export function buildRetrievalContext(input: Partial<RetrievalContext>): RetrievalContext {
    if (!input.tenantId || !input.actorId || input.verified === false) {
        throw new Error("Verified tenant and actor context is required");
    }
    const datasetIds = Array.from(new Set((input.datasetIds ?? []).filter(Boolean)));
    if (datasetIds.length === 0) throw new Error("At least one dataset is required");
    return {
        ...input,
        tenantId: input.tenantId,
        actorId: input.actorId,
        datasetIds,
        limits: normalizeRetrievalLimits(input.limits),
        verified: true,
    };
}

export function normalizeRetrievalLimits(input?: Partial<RetrievalLimits>): RetrievalLimits {
    const value = input ?? {};
    return {
        topK: clampInt(value.topK, DEFAULT_LIMITS.topK, 1, 50),
        timeoutMs: clampInt(value.timeoutMs, DEFAULT_LIMITS.timeoutMs, 250, 10_000),
        maxResultBytes: clampInt(value.maxResultBytes, DEFAULT_LIMITS.maxResultBytes, 16_384, 512 * 1024),
    };
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
}

export function filterSegmentsByAcl<T extends {
    tenantId?: string | null;
    projectId?: string | null;
    datasetId: string;
    documentId: string;
    enabled?: number | boolean;
    status?: string;
    sourceVersion?: number | null;
    indexVersion?: string | null;
    indexStatus?: string | null;
    revokedAt?: Date | string | null;
    tombstonedAt?: Date | string | null;
    aclPolicy?: { allowUserIds?: string[]; denyUserIds?: string[] } | null;
}>(segments: T[], context: RetrievalContext, expected?: { sourceVersion?: number; indexVersion?: string }): T[] {
    const readable = context.readableDocumentIds ? new Set(context.readableDocumentIds) : null;
    return segments.filter((segment) => {
        if (segment.tenantId !== context.tenantId || !context.datasetIds.includes(segment.datasetId)) return false;
        if (context.projectId && segment.projectId && segment.projectId !== context.projectId) return false;
        if (readable && !readable.has(segment.documentId)) return false;
        if (segment.revokedAt || segment.tombstonedAt || segment.indexStatus === "tombstoned" || segment.indexStatus === "failed") return false;
        const acl = segment.aclPolicy;
        if (acl?.denyUserIds?.includes(context.actorId)) return false;
        if (acl?.allowUserIds?.length && !acl.allowUserIds.includes(context.actorId)) return false;
        if (segment.enabled === false || segment.enabled === 0 || segment.status !== "completed") return false;
        if (expected?.sourceVersion != null && segment.sourceVersion !== expected.sourceVersion) return false;
        if (expected?.indexVersion && segment.indexVersion !== expected.indexVersion) return false;
        return true;
    });
}

export function buildCitation(input: {
    tenantId: string;
    projectId?: string;
    datasetId: string;
    documentId: string;
    segmentId: string;
    sourceVersion?: number | null;
    chunkIndex?: number;
    fileName?: string;
    content?: string;
    span?: { start: number; end: number };
}): RetrievalCitation {
    return {
        tenantId: input.tenantId,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        datasetId: input.datasetId,
        documentId: input.documentId,
        segmentId: input.segmentId,
        sourceVersion: input.sourceVersion ?? 1,
        ...(input.chunkIndex == null ? {} : { chunkIndex: input.chunkIndex }),
        ...(input.fileName ? { fileName: input.fileName } : {}),
        ...(input.span ? { span: input.span } : {}),
    };
}

export function redactQueryForTelemetry(query: string): { queryDigest: string; queryPreview?: string } {
    const queryDigest = createHash("sha256").update(String(query ?? "")).digest("hex");
    return { queryDigest };
}
