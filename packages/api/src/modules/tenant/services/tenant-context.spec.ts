import { selectTenantMembership } from "./tenant-context";

describe("tenant context selection", () => {
    const membership = (tenantId: string, status = "active", expiresAt: Date | null = null) =>
        ({ tenantId, status, expiresAt }) as any;

    it("selects the requested active tenant and rejects another tenant", () => {
        const memberships = [membership("tenant-a"), membership("tenant-b")];

        expect(selectTenantMembership(memberships, "tenant-b")?.tenantId).toBe("tenant-b");
        expect(selectTenantMembership(memberships, "tenant-c")).toBeNull();
    });

    it("does not guess when multiple active tenants exist", () => {
        expect(selectTenantMembership([membership("tenant-a"), membership("tenant-b")])).toBeNull();
    });

    it("ignores suspended and expired memberships", () => {
        expect(selectTenantMembership([membership("tenant-a", "suspended")], "tenant-a")).toBeNull();
        expect(
            selectTenantMembership(
                [membership("tenant-a", "active", new Date("2020-01-01T00:00:00Z"))],
                "tenant-a",
            ),
        ).toBeNull();
    });
});
