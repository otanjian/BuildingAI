import { createHash } from "crypto";

export type EmbeddingRoute = {
    modelId: string;
    modelVersion: string;
    dimension?: number;
};

export type ShadowComparison = {
    indexedIds: string[];
    baselineIds: string[];
    overlap: number;
    indexedRecall: number;
    baselineRecall: number;
    missingFromIndex: string[];
};

/** Resolve a stable model/version/dimension route from an AI model config. */
export function resolveEmbeddingRoute(model: {
    id: string;
    model: string;
    modelConfig?: Array<Record<string, unknown>> | null;
}): EmbeddingRoute {
    const config = Array.isArray(model.modelConfig) ? model.modelConfig : [];
    const get = (...keys: string[]) => {
        const item = config.find((entry) => keys.includes(String(entry.key ?? entry.field ?? "")));
        return item?.value;
    };
    const rawVersion = get("version", "model_version", "embedding_version");
    const rawDimension = get("dimension", "dimensions", "embedding_dimension");
    const dimension = rawDimension == null ? undefined : Number(rawDimension);
    if (dimension != null && (!Number.isInteger(dimension) || dimension < 1 || dimension > 16_384)) {
        throw new Error("Embedding dimension must be an integer between 1 and 16384");
    }
    return {
        modelId: model.id,
        modelVersion: String(rawVersion ?? model.model ?? model.id).trim() || model.id,
        dimension,
    };
}

/** Content checksum used for idempotent embedding and source de-duplication. */
export function embeddingChecksum(content: string): string {
    return createHash("sha256").update(String(content ?? ""), "utf8").digest("hex");
}

export function isReusableEmbedding(input: {
    checksum: string;
    modelVersion: string;
    dimension: number;
    existing?: { checksum?: string | null; modelVersion?: string | null; dimension?: number | null; status?: string | null } | null;
}): boolean {
    const existing = input.existing;
    return Boolean(
        existing &&
            existing.status === "active" &&
            existing.checksum === input.checksum &&
            existing.modelVersion === input.modelVersion &&
            existing.dimension === input.dimension,
    );
}

/** Compare bounded indexed results against the legacy baseline without exposing content. */
export function compareShadowResults(indexedIds: string[], baselineIds: string[], limit = 50): ShadowComparison {
    const indexed = Array.from(new Set(indexedIds)).slice(0, limit);
    const baseline = Array.from(new Set(baselineIds)).slice(0, limit);
    const baselineSet = new Set(baseline);
    const indexedSet = new Set(indexed);
    const overlap = indexed.filter((id) => baselineSet.has(id)).length;
    return {
        indexedIds: indexed,
        baselineIds: baseline,
        overlap,
        indexedRecall: baseline.length ? overlap / baseline.length : 1,
        baselineRecall: indexed.length ? overlap / indexed.length : 1,
        missingFromIndex: baseline.filter((id) => !indexedSet.has(id)),
    };
}
