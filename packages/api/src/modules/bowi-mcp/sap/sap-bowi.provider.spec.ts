jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { Logger } from "@nestjs/common";

import { BowiMcpRegistry } from "../services/bowi-mcp-registry.service";
import type { BowiPrincipal } from "../types/bowi-mcp.types";
import { SapBowiProvider } from "./sap-bowi.provider";

const principal = (capabilities: string[]): BowiPrincipal => ({
    actor: { kind: "runtime", id: "managed-opencode" },
    subjectUserId: "user-1",
    authSource: "opencode_session",
    agentId: "agent-1",
    conversationId: "conversation-1",
    callId: "call-1",
    capabilities: new Set(capabilities as never),
});

describe("SapBowiProvider", () => {
    function harness() {
        const adt = {
            call: jest.fn().mockResolvedValue({ ok: true }),
            updateObjectSource: jest.fn().mockResolvedValue({ updated: true }),
        };
        const pyrfc = {
            health: jest.fn().mockResolvedValue({ status: "connected" }),
            readTable: jest.fn().mockResolvedValue({ rows: [] }),
            getFunctionDescription: jest.fn().mockResolvedValue({ description: {} }),
            callRfc: jest.fn().mockResolvedValue({ result: {} }),
        };
        const provider = new SapBowiProvider(adt as never, pyrfc as never);
        return { adt, pyrfc, provider, registry: new BowiMcpRegistry([provider]) };
    }

    it("publishes only the curated stable SAP catalog", () => {
        const { registry } = harness();
        expect(registry.list().map((tool) => tool.name)).toEqual([
            "sap_activate_objects",
            "sap_call_rfc",
            "sap_create_transport",
            "sap_get_object_source",
            "sap_get_rfc_function_description",
            "sap_get_transport",
            "sap_healthcheck",
            "sap_read_table",
            "sap_run_query",
            "sap_search_objects",
            "sap_set_object_source",
        ]);
        expect(JSON.stringify(registry.list())).not.toMatch(/password|connection_id|lockHandle|subjectUserId/);
    });

    it("rejects infrastructure and secret fields at the Bowi schema boundary", () => {
        const { registry } = harness();
        expect(() =>
            registry.validateArguments("sap_read_table", {
                tableName: "T001",
                password: "secret",
            }),
        ).toThrow("Invalid tool arguments");
    });

    it("denies write capability before contacting ADT", async () => {
        const { registry, adt } = harness();
        await expect(
            registry.execute(
                "sap_set_object_source",
                { objectSourceUrl: "/source", source: "REPORT z." },
                principal(["sap.read"]),
            ),
        ).rejects.toThrow("required Bowi capability");
        expect(adt.call).not.toHaveBeenCalled();
    });

    it("maps stable arguments to ADT and emits redacted audit metadata", async () => {
        const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
        const { registry, adt } = harness();
        await registry.execute(
            "sap_set_object_source",
            { objectSourceUrl: "/source", source: "REPORT secret." },
            principal(["sap.write"]),
        );
        expect(adt.updateObjectSource).toHaveBeenCalledWith(expect.anything(), {
            objectSourceUrl: "/source",
            source: "REPORT secret.",
        });
        const audit = JSON.stringify(log.mock.calls);
        expect(audit).toContain("sap_set_object_source");
        expect(audit).toContain("call-1");
        expect(audit).not.toContain("REPORT secret");
        log.mockRestore();
    });
});
