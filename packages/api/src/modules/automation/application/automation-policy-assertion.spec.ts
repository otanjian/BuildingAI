import { signAutomationPolicy, verifyAutomationPolicy } from "./automation-policy-assertion";

describe("automation policy assertion", () => {
    it("accepts only a server signature for the exact run policy", () => {
        const policy = {
            allowedTools: [],
            deniedTools: ["shell"],
            allowExternalSideEffects: false,
            approvalTimeoutSeconds: 0,
        };
        const signature = signAutomationPolicy("run-1", policy);
        expect(verifyAutomationPolicy("run-1", policy, signature)).toBe(true);
        expect(
            verifyAutomationPolicy("run-1", { ...policy, allowedTools: ["shell"] }, signature),
        ).toBe(false);
        expect(verifyAutomationPolicy("run-2", policy, signature)).toBe(false);
    });
});
