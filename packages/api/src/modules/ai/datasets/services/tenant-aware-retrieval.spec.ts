import {
    buildCitation,
    buildRetrievalContext,
    filterSegmentsByAcl,
    normalizeRetrievalLimits,
    redactQueryForTelemetry,
} from "./tenant-aware-retrieval";

describe("tenant-aware retrieval boundaries", () => {
    it("rejects a retrieval request without verified tenant and actor scope", () => {
        expect(() => buildRetrievalContext({ datasetIds: ["dataset-a"] } as any)).toThrow(
            "Verified tenant and actor context is required",
        );
    });

    it("normalizes bounded retrieval limits", () => {
        expect(normalizeRetrievalLimits({ topK: 999, timeoutMs: 1, maxResultBytes: 1 })).toEqual({
            topK: 50,
            timeoutMs: 250,
            maxResultBytes: 16_384,
        });
    });

    it("filters revoked, disabled, stale and ACL-inaccessible segments before ranking", () => {
        const context = buildRetrievalContext({
            tenantId: "tenant-a",
            actorId: "user-a",
            datasetIds: ["dataset-a"],
            readableDocumentIds: ["doc-readable"],
        });
        const segments = [
            { id: "ok", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "doc-readable", enabled: 1, status: "completed", sourceVersion: 2, indexVersion: "idx-2" },
            { id: "other-tenant", tenantId: "tenant-b", datasetId: "dataset-a", documentId: "doc-readable", enabled: 1, status: "completed", sourceVersion: 2, indexVersion: "idx-2" },
            { id: "acl", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "doc-hidden", enabled: 1, status: "completed", sourceVersion: 2, indexVersion: "idx-2" },
            { id: "revoked", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "doc-readable", enabled: 0, status: "completed", sourceVersion: 2, indexVersion: "idx-2" },
            { id: "stale", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "doc-readable", enabled: 1, status: "completed", sourceVersion: 1, indexVersion: "idx-1" },
        ];
        expect(filterSegmentsByAcl(segments, context, { sourceVersion: 2, indexVersion: "idx-2" }).map((s) => s.id)).toEqual(["ok"]);
    });

    it("returns stable source-version citation metadata", () => {
        expect(buildCitation({
            tenantId: "tenant-a",
            datasetId: "dataset-a",
            documentId: "doc-a",
            segmentId: "seg-a",
            sourceVersion: 3,
            chunkIndex: 4,
            fileName: "guide.md",
            content: "secret should not be copied",
        })).toEqual(expect.objectContaining({
            tenantId: "tenant-a",
            datasetId: "dataset-a",
            documentId: "doc-a",
            segmentId: "seg-a",
            sourceVersion: 3,
            chunkIndex: 4,
            fileName: "guide.md",
        }));
        expect(buildCitation({
            tenantId: "tenant-a",
            datasetId: "dataset-a",
            documentId: "doc-a",
            segmentId: "seg-a",
            sourceVersion: 3,
            content: "secret",
        })).not.toHaveProperty("content");
    });

    it("stores only a digest for sensitive retrieval queries", () => {
        const telemetry = redactQueryForTelemetry("password=very-secret internal payroll");
        expect(telemetry.queryDigest).toMatch(/^[a-f0-9]{64}$/);
        expect(telemetry.queryPreview).toBeUndefined();
    });

    it("enforces document ACL, revoked and tombstoned exclusions", () => {
        const context = buildRetrievalContext({ tenantId: "tenant-a", actorId: "user-a", datasetIds: ["dataset-a"] });
        const rows = [
            { id: "allow", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "d1", enabled: 1, status: "completed", aclPolicy: { allowUserIds: ["user-a"] } },
            { id: "deny", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "d2", enabled: 1, status: "completed", aclPolicy: { denyUserIds: ["user-a"] } },
            { id: "revoked", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "d3", enabled: 1, status: "completed", revokedAt: new Date() },
            { id: "deleted", tenantId: "tenant-a", datasetId: "dataset-a", documentId: "d4", enabled: 1, status: "completed", indexStatus: "tombstoned" },
        ];
        expect(filterSegmentsByAcl(rows, context).map((r) => r.id)).toEqual(["allow"]);
    });

    it("rejects missing actor context and isolates tenant rows", () => {
        expect(() => buildRetrievalContext({ tenantId: "tenant-a", datasetIds: ["d"] } as any)).toThrow();
        const context = buildRetrievalContext({ tenantId: "tenant-a", actorId: "u", datasetIds: ["d"] });
        expect(filterSegmentsByAcl([
            { id: "other", tenantId: "tenant-b", datasetId: "d", documentId: "doc", enabled: 1, status: "completed" },
        ], context)).toEqual([]);
    });
});
