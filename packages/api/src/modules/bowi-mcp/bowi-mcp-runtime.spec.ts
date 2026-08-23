jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { BowiMcpRuntimeService } from "./services/bowi-mcp-runtime.service";
import { HttpErrorFactory } from "@buildingai/errors";

describe("BowiMcpRuntimeService", () => {
    function harness() {
        const registry = {
            list: jest.fn().mockReturnValue([{ name: "todo_search", inputSchema: { type: "object" } }]),
            get: jest.fn().mockReturnValue({ name: "todo_search" }),
            execute: jest.fn().mockResolvedValue({ items: [], total: 0 }),
            validateArguments: jest.fn(),
        };
        const principal = {
            resolve: jest.fn().mockResolvedValue({ capabilities: new Set(["todo.personal"]), subjectUserId: "user-1" }),
        };
        return { runtime: new BowiMcpRuntimeService(registry as never, principal as never), registry, principal };
    }

    it("lists stable tools with client authentication but no personal subject", async () => {
        const { runtime, registry, principal } = harness();
        const result = await runtime.dispatch(
            { jsonrpc: "2.0", id: 1, method: "tools/list" },
            { "x-buildingai-opencode-key": "key" },
        );
        expect(result).toMatchObject({ result: { tools: [{ name: "todo_search" }] } });
        expect(principal.resolve).toHaveBeenCalledWith(expect.objectContaining({ requireSubject: false }));
        expect(registry.list).toHaveBeenCalledWith(
            expect.objectContaining({ capabilities: new Set(["todo.personal"]) }),
        );
    });

    it("resolves a subject and returns structured tool content", async () => {
        const { runtime, registry, principal } = harness();
        const result = await runtime.dispatch(
            {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "todo_search",
                    arguments: {},
                    _meta: { buildingai: { sessionId: "ses-1", callId: "call-1" } },
                },
            },
            { "x-buildingai-opencode-key": "key" },
        );
        expect(principal.resolve).toHaveBeenCalledWith(
            expect.objectContaining({
                requireSubject: true,
                meta: { buildingai: { sessionId: "ses-1", callId: "call-1" } },
            }),
        );
        expect(registry.execute).toHaveBeenCalledWith("todo_search", {}, expect.anything());
        expect(result).toMatchObject({
            result: { content: [{ type: "text" }], structuredContent: { items: [], total: 0 } },
        });
    });

    it("returns expected business failures as isError tool results", async () => {
        const { runtime, registry } = harness();
        registry.execute.mockRejectedValue(new Error("Todo not found"));
        const result = await runtime.dispatch(
            {
                jsonrpc: "2.0",
                id: 3,
                method: "tools/call",
                params: { name: "todo_search", arguments: {} },
            },
            { "x-buildingai-opencode-key": "key" },
        );
        expect(result).toMatchObject({
            result: {
                isError: true,
                content: [{ type: "text", text: "Bowi tool execution failed" }],
                structuredContent: { error: { code: "BOWI_TOOL_ERROR" } },
            },
        });
    });

    it("returns stable sanitized conflict and authorization failures", async () => {
        const { runtime, registry, principal } = harness();
        registry.execute.mockRejectedValueOnce(HttpErrorFactory.conflict("Todo changed"));
        const stale = await runtime.dispatch(
            {
                jsonrpc: "2.0",
                id: 6,
                method: "tools/call",
                params: { name: "todo_update", arguments: {} },
            },
            { "x-buildingai-opencode-key": "key" },
        );
        expect(stale).toMatchObject({
            result: { isError: true, structuredContent: { error: { code: "TODO_STALE_UPDATE" } } },
        });

        principal.resolve.mockRejectedValueOnce(new Error("session lookup details"));
        const denied = await runtime.dispatch(
            {
                jsonrpc: "2.0",
                id: 7,
                method: "tools/call",
                params: { name: "todo_search", arguments: {} },
            },
            { "x-buildingai-opencode-key": "key" },
        );
        expect(JSON.stringify(denied)).not.toContain("session lookup details");
    });

    it("uses protocol errors for unknown methods and tools", async () => {
        const { runtime, registry } = harness();
        expect(await runtime.dispatch({ jsonrpc: "2.0", id: 4, method: "missing" }, {})).toMatchObject({
            error: { code: -32601 },
        });
        registry.get.mockReturnValue(undefined);
        expect(
            await runtime.dispatch(
                { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "missing" } },
                {},
            ),
        ).toMatchObject({ error: { code: -32601 } });
    });

    it("requires a verified subject for every SAP tool call", async () => {
        const { runtime, principal } = harness();

        await runtime.dispatch(
            {
                jsonrpc: "2.0",
                id: 8,
                method: "tools/call",
                params: { name: "sap_healthcheck", arguments: {} },
            },
            { "x-buildingai-opencode-key": "key" },
        );

        expect(principal.resolve).toHaveBeenCalledWith(
            expect.objectContaining({ requireSubject: true }),
        );
    });
});
