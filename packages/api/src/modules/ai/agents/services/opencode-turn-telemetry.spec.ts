jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { Logger } from "@nestjs/common";

import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

describe("OpencodeTurnTelemetryService", () => {
    it("keeps counter, gauge, and latency metrics while emitting redacted structured logs", () => {
        const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
        const service = new OpencodeTurnTelemetryService();

        service.increment("acceptance_conflict", {
            turnId: "turn-1",
            apiKey: "secret",
        });
        service.gauge("worker_queue_depth", 4, { instance: "api-1" });
        service.observe("status_latency_ms", 25, { outcome: "idle" });
        service.observe("status_latency_ms", 75, { outcome: "busy" });

        expect(service.snapshot()).toEqual({
            counters: { acceptance_conflict: 1 },
            gauges: { worker_queue_depth: 4 },
            observations: {
                status_latency_ms: { count: 2, sum: 100, max: 75, last: 75 },
            },
        });
        const entries = log.mock.calls.map(([entry]) => JSON.parse(String(entry)));
        expect(entries[0]).toMatchObject({
            event: "opencode.turn.metric",
            metric: "acceptance_conflict",
            metricType: "counter",
            turnId: "turn-1",
            apiKey: "[REDACTED]",
        });
        log.mockRestore();
    });

    it("reads bounded queue, lease, and activity ages without exposing turn content", async () => {
        const service = new OpencodeTurnTelemetryService();
        const manager = {
            query: jest.fn(async (_sql: string) => [
                {
                    queue_depth: "3",
                    oldest_activity_age_ms: "1250.5",
                    oldest_expired_lease_age_ms: "500",
                },
            ]),
        };

        await expect(service.refreshQueueMetrics(manager as any, 2, 1)).resolves.toEqual({
            queueDepth: 3,
            oldestActivityAgeMs: 1250.5,
            oldestExpiredLeaseAgeMs: 500,
        });
        expect(manager.query.mock.calls[0][0]).toContain("ai_agent_opencode_turn");
        expect(service.snapshot().gauges).toMatchObject({
            worker_capacity: 2,
            worker_in_flight: 1,
            worker_free_slots: 1,
            worker_queue_depth: 3,
            oldest_activity_age_ms: 1250.5,
            oldest_expired_lease_age_ms: 500,
        });
    });
});
