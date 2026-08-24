jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import type { BowiPrincipal } from "../types/bowi-mcp.types";
import { SapAdtMcpAdapter } from "./sap-adt-mcp.adapter";
import { SapPyrfcMcpAdapter } from "./sap-pyrfc-mcp.adapter";

const principal = (id: string, capabilities: string[] = ["sap.read", "sap.rfc"]): BowiPrincipal => ({
    actor: { kind: "runtime", id: "managed-opencode" },
    subjectUserId: id,
    authSource: "opencode_session",
    capabilities: new Set(capabilities as never),
});

describe("SAP MCP adapters", () => {
    it("uses a fresh isolated client for every ADT call", async () => {
        const client = { call: jest.fn().mockResolvedValue({ source: "REPORT z." }) };
        const profile = { requireAdtServiceProfile: jest.fn().mockReturnValue({ mode: "service" }) };
        const adapter = new SapAdtMcpAdapter(profile as never, client as never);

        await adapter.call(principal("user-1"), "getObjectSource", { objectSourceUrl: "/sap/source" });
        await adapter.call(principal("user-2"), "getObjectSource", { objectSourceUrl: "/sap/source" });

        expect(client.call).toHaveBeenCalledTimes(2);
        expect(client.call).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("8100/mcp"),
            "getObjectSource",
            { objectSourceUrl: "/sap/source" },
        );
    });

    it("keeps ADT lock handles inside one source-update session and unlocks after success", async () => {
        const session = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ lockHandle: "private-lock" })
                .mockResolvedValueOnce({ updated: true })
                .mockResolvedValueOnce({ unlocked: true }),
        };
        const client = {
            call: jest.fn(),
            withSession: jest.fn(async (_url: string, operation: (value: typeof session) => Promise<unknown>) =>
                operation(session),
            ),
        };
        const profile = { requireAdtServiceProfile: jest.fn().mockReturnValue({ mode: "service" }) };
        const adapter = new SapAdtMcpAdapter(profile as never, client as never);

        await expect(
            adapter.updateObjectSource(principal("user-1"), {
                objectSourceUrl: "/sap/source",
                source: "REPORT z.",
                transport: "DEVK900001",
            }),
        ).resolves.toEqual({ updated: true });

        expect(client.withSession).toHaveBeenCalledTimes(1);
        expect(session.call).toHaveBeenNthCalledWith(1, "lock", {
            objectUrl: "/sap/source",
            accessMode: "MODIFY",
        });
        expect(session.call).toHaveBeenNthCalledWith(2, "setObjectSource", {
            objectSourceUrl: "/sap/source",
            source: "REPORT z.",
            lockHandle: "private-lock",
            transport: "DEVK900001",
        });
        expect(session.call).toHaveBeenNthCalledWith(3, "unLock", {
            objectUrl: "/sap/source",
            lockHandle: "private-lock",
        });
    });

    it("attempts to unlock when an ADT source update fails", async () => {
        const session = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ lockHandle: "private-lock" })
                .mockRejectedValueOnce(new Error("write failed"))
                .mockResolvedValueOnce({ unlocked: true }),
        };
        const client = {
            withSession: jest.fn(async (_url: string, operation: (value: typeof session) => Promise<unknown>) =>
                operation(session),
            ),
        };
        const profile = { requireAdtServiceProfile: jest.fn().mockReturnValue({ mode: "service" }) };
        const adapter = new SapAdtMcpAdapter(profile as never, client as never);

        await expect(
            adapter.updateObjectSource(principal("user-1"), {
                objectSourceUrl: "/sap/source",
                source: "REPORT z.",
            }),
        ).rejects.toThrow("write failed");
        expect(session.call).toHaveBeenLastCalledWith("unLock", {
            objectUrl: "/sap/source",
            lockHandle: "private-lock",
        });
    });

    it("hides PyRFC connection ids and isolates leases by subject", async () => {
        const mcp = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ connection_id: "connection-user-1" })
                .mockResolvedValueOnce({ rows: [1] })
                .mockResolvedValueOnce({ connection_id: "connection-user-2" })
                .mockResolvedValueOnce({ rows: [2] }),
        };
        const profiles = {
            resolvePyrfc: jest.fn().mockResolvedValue({
                ashost: "sap.test",
                sysnr: "00",
                client: "100",
                user: "SAPUSER",
                password: "secret",
                language: "EN",
                backend: "pyrfc",
            }),
            fingerprint: jest.fn((subject: string) => `fingerprint-${subject}`),
        };
        const adapter = new SapPyrfcMcpAdapter(profiles as never, mcp as never, {
            rfcAllowlist: ["RFC_READ_TABLE"],
            now: () => 100,
        });

        await expect(adapter.readTable(principal("user-1"), { table_name: "T001" })).resolves.toEqual({ rows: [1] });
        await expect(adapter.readTable(principal("user-2"), { table_name: "T001" })).resolves.toEqual({ rows: [2] });

        const visible = JSON.stringify(mcp.call.mock.results.map((item) => item.value));
        expect(visible).not.toContain("connection-user");
        expect(mcp.call).toHaveBeenCalledWith(
            expect.any(String),
            "read_table",
            expect.objectContaining({ connection_id: "connection-user-1", table_name: "T001" }),
        );
    });

    it("removes internal connection ids from PyRFC health results", async () => {
        const mcp = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ connection_id: "private-connection" })
                .mockResolvedValueOnce({
                    status: "connected",
                    connection: { connection_id: "private-connection", backend: "adt" },
                    ping: { status: "ok" },
                }),
        };
        const profiles = {
            resolvePyrfc: jest.fn().mockResolvedValue({
                ashost: "sap.test",
                sysnr: "00",
                client: "100",
                user: "SAPUSER",
                password: "secret",
                language: "EN",
                backend: "auto",
            }),
            fingerprint: jest.fn().mockReturnValue("fingerprint-user-1"),
        };
        const adapter = new SapPyrfcMcpAdapter(profiles as never, mcp as never);

        const result = await adapter.health(principal("user-1"));

        expect(result).toEqual({
            status: "connected",
            connection: { backend: "adt" },
            ping: { status: "ok" },
        });
        expect(JSON.stringify(result)).not.toContain("private-connection");
    });

    it("enforces the RFC allowlist unless the principal is an RFC administrator", async () => {
        const mcp = { call: jest.fn() };
        const profiles = {
            resolvePyrfc: jest.fn().mockResolvedValue({ user: "u", password: "p" }),
            fingerprint: jest.fn().mockReturnValue("fp"),
        };
        const adapter = new SapPyrfcMcpAdapter(profiles as never, mcp as never, {
            rfcAllowlist: ["BAPI_COMPANYCODE_GETLIST"],
        });

        await expect(
            adapter.callRfc(principal("user-1"), {
                function_name: "Z_DANGEROUS",
                parameters: {},
            }),
        ).rejects.toMatchObject({ code: "SAP_RFC_NOT_ALLOWED" });
        expect(mcp.call).not.toHaveBeenCalled();

        mcp.call
            .mockResolvedValueOnce({ connection_id: "cid" })
            .mockResolvedValueOnce({ result: { ok: true } });
        await expect(
            adapter.callRfc(principal("admin", ["sap.rfc.admin"]), {
                function_name: "Z_DANGEROUS",
                parameters: {},
            }),
        ).resolves.toEqual({ result: { ok: true } });
    });

    it("reconnects once for an expired read lease and disconnects the stale handle", async () => {
        const mcp = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ connection_id: "stale" })
                .mockResolvedValueOnce({ error: "Unknown connection_id" })
                .mockResolvedValueOnce({ disconnected: true })
                .mockResolvedValueOnce({ connection_id: "fresh" })
                .mockResolvedValueOnce({ rows: [1] }),
        };
        const profiles = {
            resolvePyrfc: jest.fn().mockResolvedValue({ user: "u", password: "p" }),
            fingerprint: jest.fn().mockReturnValue("fp"),
        };
        const adapter = new SapPyrfcMcpAdapter(profiles as never, mcp as never, {
            rfcAllowlist: ["RFC_READ_TABLE"],
        });

        await expect(adapter.readTable(principal("user-1"), { table_name: "T001" })).resolves.toEqual({
            rows: [1],
        });
        expect(mcp.call).toHaveBeenCalledWith(expect.any(String), "sap_disconnect", {
            connection_id: "stale",
        });
        expect(mcp.call).toHaveBeenLastCalledWith(expect.any(String), "read_table", {
            table_name: "T001",
            connection_id: "fresh",
        });
    });

    it("does not retry an RFC call when the upstream handle is expired", async () => {
        const mcp = {
            call: jest
                .fn()
                .mockResolvedValueOnce({ connection_id: "stale" })
                .mockResolvedValueOnce({ error: "Unknown connection_id" }),
        };
        const profiles = {
            resolvePyrfc: jest.fn().mockResolvedValue({ user: "u", password: "p" }),
            fingerprint: jest.fn().mockReturnValue("fp"),
        };
        const adapter = new SapPyrfcMcpAdapter(profiles as never, mcp as never, {
            rfcAllowlist: ["BAPI_COMPANYCODE_GETLIST"],
        });

        await expect(
            adapter.callRfc(principal("user-1"), {
                function_name: "BAPI_COMPANYCODE_GETLIST",
                parameters_json: "{}",
            }),
        ).rejects.toMatchObject({ code: "SAP_UPSTREAM_REJECTED" });
        expect(mcp.call).toHaveBeenCalledTimes(2);
    });
});
