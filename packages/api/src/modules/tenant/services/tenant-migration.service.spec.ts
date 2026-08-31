jest.mock("@buildingai/db/@nestjs/typeorm", () => ({
    InjectDataSource: () => () => undefined,
}));
jest.mock("@buildingai/db/typeorm", () => ({
    DataSource: class DataSource {},
}));

import { TenantMigrationService } from "./tenant-migration.service";

describe("TenantMigrationService", () => {
    it("reports a missing default tenant without changing data", async () => {
        const service = new TenantMigrationService({ query: jest.fn().mockResolvedValue([]) } as any);
        await expect(service.reconcileDefaultTenant()).resolves.toMatchObject({ tenantId: null, mapped: {}, quarantined: {} });
    });

    it("describes a non-destructive rollback rehearsal", async () => {
        const service = new TenantMigrationService({ query: jest.fn() } as any);
        await expect(service.rollbackRehearsal()).resolves.toMatchObject({ reversible: true, destructiveChanges: false });
    });
});
