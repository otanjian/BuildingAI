import type { EntityManager } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

type MetricName =
    | "acceptance_conflict"
    | "commit_retry"
    | "dispatch_ambiguity"
    | "recovery_claim"
    | "billing_invariant_violation"
    | "worker_capacity"
    | "worker_in_flight"
    | "worker_free_slots"
    | "worker_queue_depth"
    | "oldest_activity_age_ms"
    | "oldest_expired_lease_age_ms"
    | "status_latency_ms";

type MetricFields = Record<string, unknown>;

export type OpencodeTurnTelemetrySnapshot = {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    observations: Record<
        string,
        { count: number; sum: number; max: number; last: number }
    >;
};

export type OpencodeTurnQueueMetrics = {
    queueDepth: number;
    oldestActivityAgeMs: number;
    oldestExpiredLeaseAgeMs: number;
};

const SENSITIVE_KEY = /(?:api.?key|authorization|password|secret|token|prompt|message|content)/i;

@Injectable()
export class OpencodeTurnTelemetryService {
    private readonly logger = new Logger(OpencodeTurnTelemetryService.name);
    private readonly counters = new Map<string, number>();
    private readonly gauges = new Map<string, number>();
    private readonly observations = new Map<
        string,
        { count: number; sum: number; max: number; last: number }
    >();

    increment(name: MetricName, fields: MetricFields = {}, amount = 1): void {
        this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
        this.emit(name, "counter", amount, fields);
    }

    gauge(name: MetricName, value: number, fields: MetricFields = {}): void {
        this.gauges.set(name, value);
        this.emit(name, "gauge", value, fields);
    }

    observe(name: MetricName, value: number, fields: MetricFields = {}): void {
        const prior = this.observations.get(name) ?? {
            count: 0,
            sum: 0,
            max: Number.NEGATIVE_INFINITY,
            last: 0,
        };
        this.observations.set(name, {
            count: prior.count + 1,
            sum: prior.sum + value,
            max: Math.max(prior.max, value),
            last: value,
        });
        this.emit(name, "observation", value, fields);
    }

    async refreshQueueMetrics(
        manager: EntityManager,
        capacity: number,
        inFlight: number,
    ): Promise<OpencodeTurnQueueMetrics> {
        const rows = await manager.query(`
            SELECT COUNT(*) FILTER (
                       WHERE lease_token IS NULL OR lease_expires_at <= now()
                   )::text AS queue_depth,
                   COALESCE(
                       MAX(EXTRACT(EPOCH FROM (now() - last_activity_at)) * 1000),
                       0
                   )::text AS oldest_activity_age_ms,
                   COALESCE(
                       MAX(EXTRACT(EPOCH FROM (now() - lease_expires_at)) * 1000)
                           FILTER (WHERE lease_expires_at <= now()),
                       0
                   )::text AS oldest_expired_lease_age_ms
            FROM ai_agent_opencode_turn
            WHERE status IN ('accepted', 'running', 'committing')
        `);
        const metrics = {
            queueDepth: Number(rows[0]?.queue_depth ?? 0),
            oldestActivityAgeMs: Number(rows[0]?.oldest_activity_age_ms ?? 0),
            oldestExpiredLeaseAgeMs: Number(rows[0]?.oldest_expired_lease_age_ms ?? 0),
        };
        this.gauge("worker_capacity", capacity);
        this.gauge("worker_in_flight", inFlight);
        this.gauge("worker_free_slots", Math.max(0, capacity - inFlight));
        this.gauge("worker_queue_depth", metrics.queueDepth);
        this.gauge("oldest_activity_age_ms", metrics.oldestActivityAgeMs);
        this.gauge("oldest_expired_lease_age_ms", metrics.oldestExpiredLeaseAgeMs);
        return metrics;
    }

    snapshot(): OpencodeTurnTelemetrySnapshot {
        return {
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            observations: Object.fromEntries(this.observations),
        };
    }

    private emit(
        metric: MetricName,
        metricType: "counter" | "gauge" | "observation",
        value: number,
        fields: MetricFields,
    ): void {
        this.logger.log(
            JSON.stringify({
                event: "opencode.turn.metric",
                metric,
                metricType,
                value,
                ...this.redact(fields),
            }),
        );
    }

    private redact(fields: MetricFields): MetricFields {
        return Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [
                key,
                SENSITIVE_KEY.test(key) ? "[REDACTED]" : value,
            ]),
        );
    }
}
