import { TenantContextService } from "./tenant-context.service";

describe("TenantContextService", () => {
    const tenant = (id: string, status = "active") => ({ id, status, policyVersion: 1 }) as any;
    const membership = (tenantId: string, userId = "user-1", status = "active") => ({
        id: `${tenantId}:${userId}`,
        tenantId,
        userId,
        status,
        expiresAt: null,
        tenant: tenant(tenantId),
    }) as any;

    it("resolves only an active membership in an active tenant", async () => {
        const membershipRepository = {
            findOne: jest.fn().mockResolvedValue(membership("tenant-a")),
        };
        const tenantRepository = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(tenant("tenant-a")) };
        const service = new TenantContextService(tenantRepository as any, membershipRepository as any);

        await expect(service.resolve("user-1", "tenant-a")).resolves.toMatchObject({ tenantId: "tenant-a" });
        membershipRepository.findOne.mockResolvedValue({ ...membership("tenant-a"), status: "suspended" });
        await expect(service.resolve("user-1", "tenant-a")).rejects.toThrow("Resource not found");
    });

    it("rejects a path tenant that disagrees with the tenant header", () => {
        expect(() => TenantContextService.assertConsistentTenant("tenant-a", "tenant-b")).toThrow("Resource not found");
        expect(() => TenantContextService.assertConsistentTenant("tenant-a", "tenant-a")).not.toThrow();
    });

    it("lists only active tenants for a user", async () => {
        const membershipRepository = {
            find: jest.fn().mockResolvedValue([
                membership("tenant-a"),
                { ...membership("tenant-b"), tenant: tenant("tenant-b", "suspended") },
            ]),
        };
        const service = new TenantContextService({ find: jest.fn() } as any, membershipRepository as any);
        await expect(service.listForUser("user-1", false)).resolves.toHaveLength(1);
    });
});
