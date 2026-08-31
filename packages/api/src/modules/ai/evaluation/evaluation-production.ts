import { createHash } from "node:crypto";

import type { GateDecision } from "./evaluation-engine";

export const READINESS_CHECKS = [
    "slo", "observability", "dependency_health", "queue_recovery", "backup_restore",
    "disaster_recovery", "capacity", "security_tests", "secret_rotation", "rollback",
] as const;
export type ReadinessCheck = (typeof READINESS_CHECKS)[number];

export interface ReadinessEvidence {
    check: ReadinessCheck;
    passed: boolean;
    observedAt: Date;
    expiresAt?: Date;
    evidenceId?: string;
    summary?: string;
}

export interface ReadinessReport {
    passed: boolean;
    checks: Array<ReadinessEvidence & { status: "passed" | "missing" | "expired" | "failed" }>;
    missing: ReadinessCheck[];
}

export function evaluateReadiness(evidence: ReadinessEvidence[], now = new Date()): ReadinessReport {
    const byCheck = new Map(evidence.map((item) => [item.check, item]));
    const checks = READINESS_CHECKS.map((check) => {
        const item = byCheck.get(check);
        const status = !item ? "missing" : item.passed === false ? "failed" : item.expiresAt && item.expiresAt.getTime() <= now.getTime() ? "expired" : "passed";
        return { ...(item ?? { check, passed: false, observedAt: now }), status } as ReadinessReport["checks"][number];
    });
    const missing = checks.filter((item) => item.status !== "passed").map((item) => item.check);
    return { passed: missing.length === 0, checks, missing };
}

export interface FeedbackSignal {
    tenantId: string;
    projectId?: string | null;
    sourceType: "production_failure" | "user_feedback" | "incident" | "tool_policy";
    sourceId?: string | null;
    summary: string;
    expectedOutcome?: Record<string, unknown> | null;
    tags?: string[];
    sensitivity?: "public" | "internal" | "restricted";
    createdBy?: string | null;
}

const redact = (value: string) => value
    .replace(/(?:password|secret|token|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi, "$1:[REDACTED]")
    .replace(/\b\d{15,19}\b/g, "[REDACTED_NUMBER]")
    .slice(0, 4000);

export function sanitizeFeedbackSignal(signal: FeedbackSignal) {
    const redactedSummary = redact(signal.summary);
    return {
        tenantId: signal.tenantId,
        projectId: signal.projectId ?? null,
        sourceType: signal.sourceType,
        sourceId: signal.sourceId ?? null,
        state: "new" as const,
        tags: [...new Set((signal.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20),
        sensitivity: signal.sensitivity ?? "internal",
        redactedSummary,
        inputDigest: createHash("sha256").update(signal.summary).digest("hex"),
        expectedOutcome: signal.expectedOutcome ?? null,
        provenance: { sourceType: signal.sourceType, sourceId: signal.sourceId ?? null, sanitized: true },
        createdBy: signal.createdBy ?? null,
    };
}

export function buildGateIntegration(gate: GateDecision, context: { releaseId: string; tenantId: string; runId: string }) {
    return {
        releaseId: context.releaseId,
        tenantId: context.tenantId,
        runId: context.runId,
        status: gate.passed ? "passed" as const : "blocked" as const,
        blocked: gate.blocked,
        failures: gate.failures.map((failure) => ({ gate: failure.gate, metric: failure.metric, reason: failure.reason })),
        auditAction: gate.passed ? "evaluation_gate_passed" : "evaluation_gate_blocked",
        usageKind: "evaluation",
        costGovernance: gate.passed ? "eligible" : "denied",
    };
}

export interface PilotCase { id: string; input: unknown; expected?: unknown; redTeam?: boolean; }
export interface PilotResult { caseId: string; passed: boolean; failureType?: string; }

export function runPilotSuite(cases: PilotCase[], execute: (item: PilotCase, seed: number) => boolean, seed = 1) {
    const ordered = [...cases].sort((a, b) => a.id.localeCompare(b.id));
    const results: PilotResult[] = ordered.map((item, index) => {
        try {
            const passed = execute(item, seed + index);
            return { caseId: item.id, passed, ...(passed ? {} : { failureType: item.redTeam ? "safety" : "quality" }) };
        } catch {
            return { caseId: item.id, passed: false, failureType: "infrastructure" };
        }
    });
    const reportHash = createHash("sha256").update(JSON.stringify({ seed, results })).digest("hex");
    return { seed, sampleCount: results.length, passedCount: results.filter((item) => item.passed).length, results, reportHash };
}
