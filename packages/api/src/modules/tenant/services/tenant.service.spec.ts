jest.mock("@buildingai/db/@nestjs/typeorm", () => ({
    InjectRepository: () => () => undefined,
}));
jest.mock("@buildingai/db/entities", () => ({
    Organization: class Organization {},
    Project: class Project {},
    ResourceGrant: class ResourceGrant {},
    Tenant: class Tenant {},
    TenantAuditEvent: class TenantAuditEvent {},
    TenantMembership: class TenantMembership {},
    TenantRole: class TenantRole {},
    User: class User {},
}));
jest.mock("@buildingai/db/typeorm", () => ({ Repository: class Repository {} }));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
    },
}));
jest.mock("@buildingai/utils", () => ({
    isEnabled: (value: unknown) => value === 1 || value === true,
}));

import { TenantService } from "./tenant.service";

function repository(overrides: Record<string, unknown> = {}) {
    return {
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => ({ id: value.id ?? "saved-id", ...value })),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        increment: jest.fn().mockResolvedValue(undefined),
        manager: {},
        ...overrides,
    } as any;
}

describe("TenantService simplified membership administration", () => {
    function service(overrides: Record<string, any> = {}) {
        const tenantRepository = overrides.tenantRepository ?? repository();
        const membershipRepository = overrides.membershipRepository ?? repository();
        const auditRepository = overrides.auditRepository ?? repository();
        const userRepository = overrides.userRepository ?? repository();
        const tenantContextService = overrides.tenantContextService ?? {
            assertAdmin: jest.fn().mockResolvedValue({
                id: "tenant-a",
                adminUserId: "admin-1",
                ownerId: "admin-1",
                status: "active",
            }),
            listForUser: jest.fn(),
            resolve: jest.fn(),
        };
        return {
            tenantRepository,
            membershipRepository,
            auditRepository,
            userRepository,
            instance: new TenantService(
                tenantRepository,
                repository(),
                repository(),
                repository(),
                membershipRepository,
                repository(),
                auditRepository,
                userRepository,
                tenantContextService,
            ),
        };
    }

    it("assigns an active member as administrator and keeps the old administrator as a member", async () => {
        const tenant = {
            id: "tenant-a",
            adminUserId: "admin-1",
            ownerId: "admin-1",
            status: "active",
        };
        const oldMembership = {
            id: "m-1",
            tenantId: "tenant-a",
            userId: "admin-1",
            roleCode: "admin",
            status: "active",
            expiresAt: null,
        };
        const newMembership = {
            id: "m-2",
            tenantId: "tenant-a",
            userId: "user-2",
            roleCode: "member",
            status: "active",
            expiresAt: null,
        };
        const membershipRepository = repository({
            findOne: jest.fn(async ({ where }) =>
                where.userId === "user-2" ? newMembership : oldMembership,
            ),
        });
        const tenantRepository = repository();
        const fixture = service({
            tenantRepository,
            membershipRepository,
            tenantContextService: { assertAdmin: jest.fn().mockResolvedValue(tenant) },
        });

        await fixture.instance.assignAdministrator("admin-1", false, "tenant-a", "user-2");

        expect(tenant.adminUserId).toBe("user-2");
        expect(oldMembership.roleCode).toBe("member");
        expect(newMembership.roleCode).toBe("admin");
        expect(tenantRepository.increment).toHaveBeenCalledWith(
            { id: "tenant-a" },
            "policyVersion",
            1,
        );
    });

    it("never updates a membership outside the selected tenant", async () => {
        const membershipRepository = repository({ findOne: jest.fn().mockResolvedValue(null) });
        const fixture = service({ membershipRepository });
        await expect(
            fixture.instance.updateMember("admin-1", false, "tenant-a", "membership-b", {
                status: "suspended",
            }),
        ).rejects.toThrow("Membership not found");
        expect(membershipRepository.findOne).toHaveBeenCalledWith({
            where: { id: "membership-b", tenantId: "tenant-a" },
        });
        expect(membershipRepository.save).not.toHaveBeenCalled();
    });

    it("lists lifecycle fields and filters archived tenants for root users", async () => {
        const tenants = [
            {
                id: "tenant-a",
                code: "alpha",
                name: "Alpha",
                status: "active",
                createdAt: new Date("2026-01-01"),
            },
            {
                id: "tenant-b",
                code: "beta",
                name: "Beta",
                status: "archived",
                createdAt: new Date("2026-01-02"),
            },
        ];
        const membershipRepository = repository({
            count: jest.fn().mockResolvedValue(3),
        });
        const tenantRepository = repository({ find: jest.fn().mockResolvedValue(tenants) });
        const fixture = service({ tenantRepository, membershipRepository });
        const result = await fixture.instance.listLifecycle("root", true, {
            page: 1,
            pageSize: 10,
        });
        expect(result.total).toBe(1);
        expect(result.items[0]).toMatchObject({
            code: "alpha",
            memberCount: 3,
            openingDate: tenants[0].createdAt,
        });
    });

    it("creates a tenant with a new administrator in one transaction", async () => {
        const transaction = jest.fn(async (run: any) =>
            run({
                getRepository: (entity: any) =>
                    entity.name === "User"
                        ? userRepository
                        : entity.name === "Tenant"
                          ? tenantRepository
                          : entity.name === "TenantMembership"
                            ? membershipRepository
                            : auditRepository,
            }),
        );
        const userRepository = repository({
            findOne: jest.fn().mockResolvedValue(null),
            manager: { transaction },
        });
        const tenantRepository = repository({
            create: jest.fn((v) => ({ id: "tenant-new", ...v })),
        });
        const membershipRepository = repository({
            create: jest.fn((v) => ({ id: "membership-new", ...v })),
        });
        const auditRepository = repository();
        const fixture = service({
            tenantRepository,
            membershipRepository,
            userRepository,
            auditRepository,
        });
        // The mocked transaction repository lookup uses class names, matching
        // the lightweight entity mocks declared at the top of this spec.
        const result = await fixture.instance.createTenant("root", true, {
            name: "New Tenant",
            code: "new-tenant",
            username: "newadmin",
            password: "secret1",
        } as any);
        expect(result).toMatchObject({
            id: "tenant-new",
            code: "new-tenant",
            adminUserId: "saved-id",
        });
        expect(transaction).toHaveBeenCalled();
        expect(auditRepository.save).toHaveBeenCalled();
    });

    it("rejects duplicate tenant codes before opening a transaction", async () => {
        const tenantRepository = repository({
            findOne: jest.fn().mockResolvedValue({ id: "existing", code: "new-tenant" }),
            manager: { transaction: jest.fn() },
        });
        const fixture = service({ tenantRepository });
        await expect(
            fixture.instance.createTenant("root", true, {
                name: "Duplicate",
                code: "new-tenant",
                username: "duplicate-admin",
                password: "secret1",
            } as any),
        ).rejects.toThrow("Tenant code already exists");
        expect(tenantRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it("rejects deleting the default tenant and removing its sole administrator", async () => {
        const tenantRepository = repository({
            findOne: jest.fn().mockResolvedValue({
                id: "default",
                code: "default",
                status: "active",
                ownerId: "admin",
            }),
        });
        const membershipRepository = repository({
            findOne: jest.fn().mockResolvedValue({
                id: "m-1",
                tenantId: "default",
                userId: "admin",
                status: "active",
            }),
        });
        const fixture = service({
            tenantRepository,
            membershipRepository,
            tenantContextService: {
                assertAdmin: jest.fn().mockResolvedValue({
                    id: "default",
                    code: "default",
                    status: "active",
                    ownerId: "admin",
                }),
            },
        });
        await expect(fixture.instance.archiveTenant("root", true, "default")).rejects.toThrow(
            "default tenant",
        );
        await expect(fixture.instance.removeMember("root", true, "default", "m-1")).rejects.toThrow(
            "sole tenant administrator",
        );
    });
});
