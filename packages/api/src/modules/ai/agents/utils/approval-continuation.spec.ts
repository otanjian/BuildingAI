import { mergeApprovalDecisions, mergeTrustedApprovalContinuation } from "./approval-continuation";

const persisted = {
    id: "assistant-1",
    role: "assistant",
    parts: [
        { type: "text", text: "already public" },
        { type: "dynamic-tool", toolCallId: "tool-1", state: "approval-requested", input: {} },
    ],
};

describe("approval continuation trust boundary", () => {
    it("accepts only approval decisions from the client", () => {
        const merged = mergeApprovalDecisions(persisted as any, {
            ...persisted,
            parts: [
                { type: "text", text: "tampered secret" },
                {
                    type: "dynamic-tool",
                    toolCallId: "tool-1",
                    state: "approval-responded",
                    approval: { approved: true },
                    input: { tampered: true },
                },
            ],
        } as any);

        expect(merged.parts[0]).toEqual({ type: "text", text: "already public" });
        expect(merged.parts[1]).toMatchObject({
            toolCallId: "tool-1",
            state: "approval-responded",
            approval: { approved: true },
            input: {},
        });
    });

    it("preserves trusted display prefix and returns only appended parts", () => {
        const result = mergeTrustedApprovalContinuation(persisted as any, {
            ...persisted,
            parts: [
                persisted.parts[0],
                { ...persisted.parts[1], state: "output-available", output: { ok: true } },
                { type: "text", text: "new secret" },
            ],
        } as any);

        expect(result.trustedParts[0]).toBe(persisted.parts[0]);
        expect(result.appendedParts).toEqual([{ type: "text", text: "new secret" }]);
    });

    it("rejects mutation or removal of trusted display prefix", () => {
        expect(() =>
            mergeTrustedApprovalContinuation(persisted as any, {
                ...persisted,
                parts: [
                    { type: "text", text: "changed" },
                    persisted.parts[1],
                    { type: "text", text: "new" },
                ],
            } as any),
        ).toThrow("approval_continuation_prefix_mismatch");
    });
});
