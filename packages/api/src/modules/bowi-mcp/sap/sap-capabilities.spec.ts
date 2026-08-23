import { configuredSapCapabilities } from "./sap-capabilities";

describe("configuredSapCapabilities", () => {
    it("fails closed in production when no capabilities are configured", () => {
        expect(configuredSapCapabilities(undefined, "production")).toEqual([]);
    });

    it("uses read and approved RFC capabilities for local managed OpenCode", () => {
        expect(configuredSapCapabilities(undefined, "development")).toEqual([
            "sap.read",
            "sap.rfc",
        ]);
    });

    it("accepts only known granular SAP capabilities", () => {
        expect(
            configuredSapCapabilities(
                "sap.transport, sap.read, todo.personal, sap.read, sap.rfc.admin,unknown",
                "production",
            ),
        ).toEqual(["sap.transport", "sap.read", "sap.rfc.admin"]);
    });
});
