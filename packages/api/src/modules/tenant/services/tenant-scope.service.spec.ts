jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));

import { TenantScopeService } from "./tenant-scope.service";

describe("TenantScopeService", () => {
    it("requires a verified tenant for scoped operations", () => {
        expect(() => new TenantScopeService().requireTenant({})).toThrow("Select an active tenant");
    });

    it("hides resources with a different tenant", () => {
        expect(() => new TenantScopeService().assertTenant("tenant-b", { tenantId: "tenant-a" })).toThrow(
            "Resource not found",
        );
    });
});
