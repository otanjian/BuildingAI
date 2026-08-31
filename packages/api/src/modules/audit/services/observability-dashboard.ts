import { Injectable } from "@nestjs/common";
import type { AuditEvent } from "@buildingai/db/entities";

export type ObservabilityAlert = { severity: "info" | "warning" | "critical"; signal: string; message: string };

@Injectable()
export class ObservabilityDashboardService {
    summarize(events: Pick<AuditEvent, "action" | "outcome" | "latencyMs">[]): { total: number; denied: number; failed: number; p95LatencyMs: number; alerts: ObservabilityAlert[] } {
        const latencies = events.map((e) => Number(e.latencyMs ?? 0)).filter((v) => v > 0).sort((a, b) => a - b);
        const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)] : 0;
        const denied = events.filter((e) => e.outcome === "denied").length;
        const failed = events.filter((e) => e.outcome === "failed").length;
        const alerts: ObservabilityAlert[] = [];
        if (p95 > 5000) alerts.push({ severity: "warning", signal: "latency", message: "p95 latency exceeds 5s" });
        if (failed > Math.max(5, events.length * 0.1)) alerts.push({ severity: "critical", signal: "failures", message: "failure rate exceeds 10%" });
        if (denied > Math.max(10, events.length * 0.2)) alerts.push({ severity: "warning", signal: "denials", message: "authorization denials are elevated" });
        return { total: events.length, denied, failed, p95LatencyMs: p95, alerts };
    }

    /** Build a stable, redacted export shape for console downloads. */
    toExportRow(event: Pick<AuditEvent, "id" | "tenantId" | "action" | "outcome" | "requestId" | "correlationId" | "latencyMs" | "createdAt">) {
        return {
            id: event.id,
            tenantId: event.tenantId,
            action: event.action,
            outcome: event.outcome,
            requestId: event.requestId,
            correlationId: event.correlationId,
            latencyMs: event.latencyMs ?? 0,
            createdAt: event.createdAt,
        };
    }
}
