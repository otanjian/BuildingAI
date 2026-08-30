import { Injectable, Logger } from "@nestjs/common";
import { redactPayload } from "../utils/redaction";
import type { RequestContext } from "./request-context";

@Injectable()
export class ObservabilityAdapters {
    private readonly logger = new Logger("Observability");
    private readonly cardinality = new Map<string, Set<string>>();
    log(event: string, context: RequestContext, fields: Record<string, unknown> = {}) {
        this.logger.log(JSON.stringify({ event, requestId: context.requestId, correlationId: context.correlationId, tenantId: context.tenantId, projectId: context.projectId, ...redactPayload(fields) as Record<string, unknown> }));
    }
    metric(name: string, value: number, labels: Record<string, string> = {}) {
        const safeLabels = Object.fromEntries(Object.entries(labels)
            .filter(([key]) => !/prompt|token|secret|email|phone/i.test(key))
            .slice(0, 12)
            .map(([key, label]) => [key, this.boundLabel(name, key, label)]));
        this.logger.debug(JSON.stringify({ metric: name, value, labels: safeLabels }));
    }
    trace(context: RequestContext, span: { name: string; durationMs?: number; attributes?: Record<string, unknown> }) {
        return { traceId: context.traceId || context.correlationId, spanId: `${context.requestId}:${span.name}`, name: span.name, durationMs: span.durationMs ?? 0, attributes: redactPayload(span.attributes || {}) };
    }

    private boundLabel(metric: string, key: string, value: string): string {
        if (!/tenant|agent|tool|project|user/i.test(key)) return value;
        const setKey = `${metric}:${key}`;
        const values = this.cardinality.get(setKey) || new Set<string>();
        if (values.has(value)) return value;
        if (values.size >= 100) return "[CARDINALITY_LIMITED]";
        values.add(value);
        this.cardinality.set(setKey, values);
        return value;
    }
}

export const AUDIT_OPERATION_ACTIONS = ["authentication", "authorization", "agent.execution", "model.call", "retrieval", "tool.discovery", "tool.execution", "approval", "release", "export", "delete", "policy.decision"] as const;
export type AuditOperationAction = (typeof AUDIT_OPERATION_ACTIONS)[number];
