import { describe, expect, it } from "vitest";

import { resolveTenantSelection } from "./tenant-context";

describe("resolveTenantSelection", () => {
    const tenants = [
        { id: "default", status: "active" },
        { id: "tenant-b", status: "active" },
        { id: "archived", status: "archived" },
    ];

    it("keeps a valid active selection", () => {
        expect(resolveTenantSelection(tenants, "tenant-b", "default")).toBe("tenant-b");
    });

    it("falls back to the default tenant when the selection is unavailable", () => {
        expect(resolveTenantSelection(tenants, "missing", "default")).toBe("default");
        expect(resolveTenantSelection(tenants, "archived", "default")).toBe("default");
    });

    it("returns no tenant when the server list has no active tenants", () => {
        expect(resolveTenantSelection([{ id: "archived", status: "archived" }])).toBeUndefined();
    });
});
