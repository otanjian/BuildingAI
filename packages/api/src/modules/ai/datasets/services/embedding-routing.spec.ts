import {
    compareShadowResults,
    embeddingChecksum,
    isReusableEmbedding,
    resolveEmbeddingRoute,
} from "./embedding-routing";

describe("embedding routing and shadow comparison", () => {
    it("resolves model version and validates dimension", () => {
        expect(resolveEmbeddingRoute({ id: "m1", model: "embed-v2", modelConfig: [
            { key: "version", value: "2025-01" }, { key: "dimension", value: 1536 },
        ] })).toEqual({ modelId: "m1", modelVersion: "2025-01", dimension: 1536 });
        expect(() => resolveEmbeddingRoute({ id: "m1", model: "x", modelConfig: [{ key: "dimension", value: 0 }] })).toThrow();
    });

    it("deduplicates embeddings by content checksum and route", () => {
        const checksum = embeddingChecksum("same content");
        expect(checksum).toHaveLength(64);
        expect(isReusableEmbedding({ checksum, modelVersion: "v1", dimension: 3, existing: { checksum, modelVersion: "v1", dimension: 3, status: "active" } })).toBe(true);
        expect(isReusableEmbedding({ checksum, modelVersion: "v2", dimension: 3, existing: { checksum, modelVersion: "v1", dimension: 3, status: "active" } })).toBe(false);
    });

    it("compares bounded ids without logging content", () => {
        expect(compareShadowResults(["a", "b"], ["b", "c"])).toEqual(expect.objectContaining({ overlap: 1, missingFromIndex: ["c"] }));
    });
});
