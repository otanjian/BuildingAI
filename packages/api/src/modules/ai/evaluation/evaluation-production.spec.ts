import { buildGateIntegration, evaluateReadiness, runPilotSuite, sanitizeFeedbackSignal } from "./evaluation-production";

describe("evaluation production readiness", () => {
    it("redacts production feedback and preserves provenance", () => {
        const result = sanitizeFeedbackSignal({ tenantId: "t1", sourceType: "incident", sourceId: "inc-1", summary: "password=super-secret 4111111111111111", tags: [" Regression ", "regression"] });
        expect(result.redactedSummary).toContain("REDACTED");
        expect(result.redactedSummary).not.toContain("super-secret");
        expect(result.tags).toEqual(["regression"]);
        expect(result.provenance.sanitized).toBe(true);
    });

    it("blocks readiness for missing, failed, or expired evidence", () => {
        const now = new Date("2026-01-01T00:00:00Z");
        const report = evaluateReadiness([{ check: "slo", passed: true, observedAt: now }, { check: "backup_restore", passed: true, observedAt: now, expiresAt: new Date("2025-12-01T00:00:00Z") }], now);
        expect(report.passed).toBe(false);
        expect(report.missing).toContain("backup_restore");
        expect(report.checks.find((item) => item.check === "backup_restore")?.status).toBe("expired");
    });

    it("produces deterministic pilot reports and gate integration metadata", () => {
        const execute = (item: { id: string }) => item.id !== "bad";
        const first = runPilotSuite([{ id: "bad", input: {} }, { id: "ok", input: {} }], execute, 7);
        const second = runPilotSuite([{ id: "ok", input: {} }, { id: "bad", input: {} }], execute, 7);
        expect(first.reportHash).toBe(second.reportHash);
        expect(buildGateIntegration({ passed: false, blocked: true, failures: [{ gate: "safety", metric: "pii", reason: "hard safety failure" }] }, { releaseId: "r1", tenantId: "t1", runId: "run1" }).costGovernance).toBe("denied");
    });
});
