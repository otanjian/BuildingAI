jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        forbidden: (message: string) => new Error(message),
    },
}));

import { EnterpriseIamPolicyService } from "./enterprise-iam-policy.service";

describe("EnterpriseIamPolicyService", () => {
    it("rejects invalid federation assertions", () => {
        const service = new EnterpriseIamPolicyService();
        expect(() => service.validateFederation({ issuer: "https://bad", audience: "x", nonce: "n", signatureValid: false }, { issuer: "https://good", audience: "x", nonce: "n" })).toThrow();
    });

    it("requires recent step-up for sensitive actions", () => {
        const service = new EnterpriseIamPolicyService();
        const policy = { required: true, stepUpMinutes: 15, sensitiveActions: ["export"] } as any;
        expect(service.requiresStepUp(policy, "export", null)).toBe(true);
        expect(service.requiresStepUp(policy, "export", new Date(Date.now() - 20 * 60_000))).toBe(true);
        expect(service.requiresStepUp(policy, "export", new Date())).toBe(false);
    });

    it("blocks disallowed residency and training routes and masks restricted text", () => {
        const service = new EnterpriseIamPolicyService();
        const policy = { allowedRegions: ["cn"], allowCrossRegion: false, allowVendorTraining: false, maskingRules: { restricted: "mask" } } as any;
        expect(service.evaluateProviderRoute(policy, { region: "us", vendorTraining: false })).toEqual({ allowed: false, reason: "region_not_allowed" });
        expect(service.evaluateProviderRoute(policy, { region: "cn", vendorTraining: true })).toEqual({ allowed: false, reason: "vendor_training_not_allowed" });
        expect(service.maskRestricted("email=a@example.com", "restricted")).toBe("[REDACTED]");
    });
});
