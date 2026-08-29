jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { BOWI_MCP_TOOL_CATALOG } from "@buildingai/constants/shared/bowi-mcp.constant";

import { BowiMcpCatalogSyncService } from "./services/bowi-mcp-catalog-sync.service";

describe("BowiMcpCatalogSyncService", () => {
    const todoProvider = {
        bowiMcpProvider: true,
        namespace: "todo",
        tools: [
            {
                name: "todo_search",
                description: "Search",
                inputSchema: { type: "object", properties: {}, additionalProperties: false },
                capability: "todo.personal",
                execute: jest.fn(),
            },
        ],
    };
    const ehcsProvider = {
        bowiMcpProvider: true,
        namespace: "ehcs",
        tools: BOWI_MCP_TOOL_CATALOG.map((definition) => ({
            ...definition,
            inputSchema: { ...definition.inputSchema, additionalProperties: false },
            capability: "ehcs.operator",
            execute: jest.fn(),
        })),
    };

    function harness(
        discovered: unknown[],
        existing?: Record<string, unknown>,
        agents: Array<Record<string, unknown>> = [],
    ) {
        const registry = {
            register: jest.fn(),
            list: jest
                .fn()
                .mockImplementation(() =>
                    discovered
                        .flatMap((wrapper: any) => wrapper.instance?.tools ?? [])
                        .map(({ execute: _e, capability: _c, ...tool }: any) => tool),
                ),
        };
        const server = { ...existing } as any;
        const serverRepository = {
            findOne: jest.fn().mockResolvedValue(existing ? server : null),
            create: jest.fn().mockImplementation((value) => ({ id: "server-1", ...value })),
            save: jest
                .fn()
                .mockImplementation(async (value) =>
                    Object.assign(server, value, { id: value.id ?? "server-1" }),
                ),
        };
        const toolRepository = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const agentRepository = {
            find: jest.fn().mockResolvedValue(agents),
            save: jest.fn().mockResolvedValue(undefined),
        };
        const service = new BowiMcpCatalogSyncService(
            { getProviders: () => discovered } as never,
            registry as never,
            serverRepository as never,
            toolRepository as never,
            agentRepository as never,
        );
        return { service, registry, serverRepository, toolRepository, agentRepository, server };
    }

    it("does not switch a legacy EHCS server before its provider is discovered", async () => {
        const legacyUrl = "http://localhost/ehcs-ai/consoleapi/bowi-mcp/mcp";
        const h = harness([{ instance: todoProvider }], {
            id: "server-1",
            name: "bowi-mcp",
            url: legacyUrl,
        });
        await h.service.onApplicationBootstrap();
        expect(h.serverRepository.save).not.toHaveBeenCalled();
        expect(h.server.url).toBe(legacyUrl);
    });

    it("creates a Todo-only canonical server when no legacy server exists", async () => {
        const h = harness([{ instance: todoProvider }]);

        await h.service.onApplicationBootstrap();

        expect(h.serverRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "bowi-mcp",
                url: expect.stringContaining("/api/mcp/bowi-mcp"),
            }),
        );
        expect(h.toolRepository.save).toHaveBeenCalledTimes(1);
    });

    it("switches the canonical server only after merging Todo and EHCS tools", async () => {
        const h = harness([{ instance: todoProvider }, { instance: ehcsProvider }], {
            id: "server-1",
            name: "bowi-mcp",
            url: "http://localhost/ehcs-ai/consoleapi/bowi-mcp/mcp",
        });
        await h.service.onApplicationBootstrap();
        expect(h.registry.register).toHaveBeenCalledTimes(2);
        expect(h.serverRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "bowi-mcp",
                type: "system",
                url: expect.stringContaining("/api/mcp/bowi-mcp"),
            }),
        );
        expect(h.toolRepository.save).toHaveBeenCalledTimes(BOWI_MCP_TOOL_CATALOG.length + 1);
    });

    it("repairs an empty OpenCode Bowi binding", async () => {
        const agent = { id: "agent-opencode", createMode: "opencode", mcpServerIds: [] };
        const h = harness([{ instance: todoProvider }], undefined, [agent]);

        await h.service.onApplicationBootstrap();
        await h.service.onApplicationBootstrap();

        expect(h.agentRepository.save).toHaveBeenCalledTimes(1);
        expect(h.agentRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "agent-opencode",
                mcpServerIds: ["server-1"],
            }),
        );
    });

    it("preserves unrelated bindings and does not duplicate Bowi", async () => {
        const alreadyBound = {
            id: "agent-bound",
            createMode: "opencode",
            mcpServerIds: ["erp-server", "server-1", "server-1"],
        };
        const h = harness([{ instance: todoProvider }], undefined, [alreadyBound]);

        await h.service.onApplicationBootstrap();

        expect(h.agentRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "agent-bound",
                mcpServerIds: ["erp-server", "server-1"],
            }),
        );
    });

    it("does not rewrite an already-canonical OpenCode binding", async () => {
        const agent = { id: "agent-bound", createMode: "opencode", mcpServerIds: ["server-1"] };
        const h = harness([{ instance: todoProvider }], undefined, [agent]);

        await h.service.onApplicationBootstrap();

        expect(h.agentRepository.save).not.toHaveBeenCalled();
    });

    it("leaves non-OpenCode agents unchanged", async () => {
        const agent = { id: "agent-direct", createMode: "direct", mcpServerIds: [] };
        const h = harness([{ instance: todoProvider }], undefined, [agent]);

        await h.service.onApplicationBootstrap();

        expect(h.agentRepository.save).not.toHaveBeenCalled();
    });

    it("fails soft when the canonical Bowi server is unavailable", async () => {
        const h = harness([{ instance: todoProvider }]);
        h.serverRepository.findOne.mockResolvedValueOnce(undefined);
        h.serverRepository.create.mockImplementationOnce(() => {
            throw new Error("canonical server unavailable");
        });

        await expect(h.service.onApplicationBootstrap()).resolves.toBeUndefined();
        expect(h.agentRepository.save).not.toHaveBeenCalled();
    });
});
