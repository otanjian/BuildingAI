import { runRetrievalBenchmark } from "./retrieval-benchmark";

describe("retrieval benchmark", () => {
    it("reports p95 latency and throughput", async () => {
        const corpus = Array.from({ length: 1_000 }, (_, index) => ({
            tenantId: index % 3 === 0 ? "tenant-a" : "tenant-b",
            acl: index % 5 === 0 ? "deny" : "allow",
            score: 1 / (index + 1),
        }));
        const result = await runRetrievalBenchmark(async () => {
            corpus
                .filter((row) => row.tenantId === "tenant-a" && row.acl === "allow")
                .sort((a, b) => b.score - a.score)
                .slice(0, 20);
        }, 100);
        expect(result.iterations).toBe(100);
        expect(result.p95Ms).toBeGreaterThanOrEqual(0);
        expect(result.throughputPerSecond).toBeGreaterThan(0);
    });
});
