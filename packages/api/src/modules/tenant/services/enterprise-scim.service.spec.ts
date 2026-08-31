import { EnterpriseScimService } from "./enterprise-scim.service";

describe("EnterpriseScimService", () => {
    it("derives an idempotent event identity for the same tenant/resource/action", () => {
        const service = new EnterpriseScimService();
        const first = service.syncUser("tenant-a", {
            externalId: "user-1",
            userId: "local-1",
            active: true,
        });
        const second = service.syncUser("tenant-a", {
            externalId: "user-1",
            userId: "local-1",
            active: true,
        });

        expect(first).toEqual({
            eventId: second.eventId,
            action: "update",
            dryRun: false,
            invalidateSessions: false,
            revokeCredentials: false,
        });
    });

    it("supports dry-run deprovision with session and credential revocation hooks", () => {
        const result = new EnterpriseScimService().syncUser(
            "tenant-a",
            { externalId: "user-1", userId: "local-1", active: false, groups: [] },
            { dryRun: true },
        );

        expect(result.action).toBe("disable");
        expect(result.dryRun).toBe(true);
        expect(result.invalidateSessions).toBe(true);
        expect(result.revokeCredentials).toBe(true);
    });
});
