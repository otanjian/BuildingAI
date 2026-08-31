import fs from "node:fs";
import path from "node:path";

describe("TenantConsoleController", () => {
    it("does not require a platform permission for the authenticated tenant list", () => {
        const source = fs.readFileSync(path.join(__dirname, "tenant.controller.ts"), "utf8");
        expect(source).toMatch(/@Get\(\)\s+async list/);
        expect(source).not.toMatch(/@Get\(\)\s+@Permissions\([\s\S]*?\)\s+async list/);
    });

    it("exposes the tenant lifecycle contract", () => {
        const source = fs.readFileSync(path.join(__dirname, "tenant.controller.ts"), "utf8");
        expect(source).toMatch(/@Post\(\)\s+@Permissions\(\{ code: "tenants:create"/);
        expect(source).toMatch(/@Patch\(":tenantId\/status"\)/);
        expect(source).toMatch(/@Delete\(":tenantId"\)/);
        expect(source).toMatch(/@Delete\(":tenantId\/members\/:membershipId"\)/);
        expect(source).toMatch(/QueryTenantListDto/);
        expect(source).toMatch(/CreateTenantDto/);
    });
});
