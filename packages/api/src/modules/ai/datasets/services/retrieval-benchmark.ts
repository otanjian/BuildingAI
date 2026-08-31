import { performance } from "node:perf_hooks";

export type RetrievalBenchmarkResult = {
    iterations: number;
    p95Ms: number;
    averageMs: number;
    throughputPerSecond: number;
};

/** Small deterministic benchmark helper used by CI and migration rehearsals. */
export async function runRetrievalBenchmark(
    retrieve: () => Promise<unknown>,
    iterations = 20,
): Promise<RetrievalBenchmarkResult> {
    const count = Math.max(1, Math.floor(iterations));
    const samples: number[] = [];
    for (let i = 0; i < count; i += 1) {
        const started = performance.now();
        await retrieve();
        samples.push(performance.now() - started);
    }
    samples.sort((a, b) => a - b);
    const p95Index = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1);
    const averageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return {
        iterations: count,
        p95Ms: Number(samples[p95Index].toFixed(2)),
        averageMs: Number(averageMs.toFixed(2)),
        throughputPerSecond: Number((1000 / Math.max(averageMs, 0.01)).toFixed(2)),
    };
}
