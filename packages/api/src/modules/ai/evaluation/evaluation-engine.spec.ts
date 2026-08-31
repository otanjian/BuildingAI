import { aggregateMetrics, evaluateGates, evaluateQuality, evaluateSafety, hashEvaluationConfiguration } from "./evaluation-engine";

describe("evaluation engine", () => {
    it("evaluates quality and safety without exposing sensitive evidence", () => {
        const quality = evaluateQuality({ answer: "42", expectedAnswer: "42", citations: [{ documentId: "doc-1" }] });
        expect(quality.find((metric) => metric.name === "task_success")?.passed).toBe(true);
        expect(evaluateSafety({ answer: "password: leaked", allowedDocumentIds: ["doc-1"], retrievedDocumentIds: ["doc-2"] }).every((metric) => !metric.passed)).toBe(false);
        expect(evaluateSafety({ answer: "password: leaked", allowedDocumentIds: ["doc-1"], retrievedDocumentIds: ["doc-2"] }).find((metric) => metric.name === "pii_leakage")?.passed).toBe(false);
    });
    it("aggregates metrics and hard-blocks safety failures", () => {
        const aggregate = aggregateMetrics([{ name: "task_success", score: 0.5, passed: false, evidence: {} }, { name: "task_success", score: 1, passed: true, evidence: {} }, { name: "unauthorized_retrieval", score: 0, passed: false, evidence: {} }]);
        const decision = evaluateGates(aggregate, [{ name: "quality", metric: "task_success", minimum: 0.8 }, { name: "safety", metric: "unauthorized_retrieval", hardSafety: true }]);
        expect(decision.blocked).toBe(true);
        expect(decision.failures).toHaveLength(2);
    });
    it("hashes configuration deterministically", () => {
        expect(hashEvaluationConfiguration({ b: 2, a: 1 })).toBe(hashEvaluationConfiguration({ a: 1, b: 2 }));
    });
});
