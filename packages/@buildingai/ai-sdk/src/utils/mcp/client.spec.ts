jest.mock("@ai-sdk/mcp", () => ({
    experimental_createMCPClient: jest.fn(),
}));

import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { createMcpClient, detectMcpProtocol } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

describe("MCP protocol selection", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("selects modern MCP only when the endpoint advertises the requested version", async () => {
        const fetchFn = jest.fn().mockResolvedValue(
            jsonResponse({
                jsonrpc: "2.0",
                id: 0,
                result: { supportedVersions: ["2026-07-28"] },
            }),
        );

        await expect(
            detectMcpProtocol("http://doris.test/mcp", undefined, "buildingai", "test", fetchFn),
        ).resolves.toEqual({ protocol: "modern", supportedVersions: ["2026-07-28"] });
    });

    it("keeps legacy compatibility for unavailable or malformed discovery responses", async () => {
        await expect(
            detectMcpProtocol(
                "http://legacy.test/mcp",
                undefined,
                undefined,
                undefined,
                jest.fn().mockResolvedValue(new Response("not found", { status: 404 })),
            ),
        ).resolves.toMatchObject({ protocol: "legacy" });

        await expect(
            detectMcpProtocol(
                "http://legacy.test/mcp",
                undefined,
                undefined,
                undefined,
                jest.fn().mockResolvedValue(jsonResponse({ jsonrpc: "2.0", id: 0, result: {} })),
            ),
        ).resolves.toMatchObject({ protocol: "legacy" });
    });

    it("uses the injected fetch and modern transport without changing legacy transports", async () => {
        const fetchFn = jest
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: "2.0",
                    id: 0,
                    result: { supportedVersions: ["2026-07-28"] },
                }),
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: "2.0",
                    id: 1,
                    result: { tools: [{ name: "doris_query", inputSchema: { type: "object" } }] },
                }),
            );

        const client = await createMcpClient({
            transport: {
                type: "http",
                url: "http://doris.test/mcp",
                headers: { Authorization: "Bearer test-token" },
            },
            fetchFn,
        });

        await expect(client.listTools()).resolves.toEqual([
            { name: "doris_query", inputSchema: { type: "object" } },
        ]);
        expect(fetchFn).toHaveBeenCalledTimes(2);
        expect((fetchFn.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(
            "Bearer test-token",
        );
        expect((fetchFn.mock.calls[1][1]?.headers as Record<string, string>)["mcp-method"]).toBe("tools/list");
    });

    it("uses the existing AI SDK client for legacy HTTP and SSE endpoints", async () => {
        const legacyClient = {
            tools: jest.fn().mockResolvedValue({}),
            listTools: jest.fn().mockResolvedValue({
                tools: [{ name: "legacy_tool", description: "legacy" }],
            }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        (experimental_createMCPClient as jest.Mock).mockResolvedValue(legacyClient);

        const legacyFetch = jest.fn().mockResolvedValue(new Response("unsupported", { status: 405 }));
        const httpClient = await createMcpClient({
            transport: { type: "http", url: "http://legacy.test/mcp" },
            fetchFn: legacyFetch,
        });
        await expect(httpClient.listTools()).resolves.toEqual([
            { name: "legacy_tool", description: "legacy" },
        ]);
        expect(experimental_createMCPClient).toHaveBeenCalledTimes(1);
        expect((experimental_createMCPClient as jest.Mock).mock.calls[0][0].transport.fetch).toBe(legacyFetch);

        const sseClient = await createMcpClient({
            transport: { type: "sse", url: "http://legacy.test/sse" },
            fetchFn: legacyFetch,
        });
        await expect(sseClient.listTools()).resolves.toEqual([
            { name: "legacy_tool", description: "legacy" },
        ]);
        expect(experimental_createMCPClient).toHaveBeenCalledTimes(2);
        expect((experimental_createMCPClient as jest.Mock).mock.calls[1][0].transport.fetch).toBe(legacyFetch);
    });
});
