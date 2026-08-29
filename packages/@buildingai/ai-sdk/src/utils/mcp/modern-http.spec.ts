import { ModernMcpHttpClient } from "./modern-http";

describe("ModernMcpHttpClient", () => {
    it("sends modern metadata and lists tools", async () => {
        const fetchFn = jest.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    result: {
                        tools: [
                            {
                                name: "doris_query",
                                description: "Query Doris",
                                inputSchema: { type: "object", properties: {} },
                            },
                        ],
                    },
                }),
                { headers: { "content-type": "application/json" } },
            ),
        );

        const client = new ModernMcpHttpClient({
            url: "http://doris.test/mcp",
            name: "buildingai",
            version: "test",
            fetchFn,
        });

        await expect(client.listTools()).resolves.toEqual([
            {
                name: "doris_query",
                description: "Query Doris",
                inputSchema: { type: "object", properties: {} },
            },
        ]);

        const [url, init] = fetchFn.mock.calls[0];
        expect(url).toBe("http://doris.test/mcp");
        expect((init?.headers as Record<string, string>)["mcp-protocol-version"]).toBe("2026-07-28");
        expect((init?.headers as Record<string, string>)["mcp-method"]).toBe("tools/list");
        expect(JSON.parse(String(init?.body)).params._meta).toEqual({
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": { name: "buildingai", version: "test" },
        });
    });

    it("parses an SSE response and invokes a tool", async () => {
        const fetchFn = jest.fn().mockResolvedValue(
            new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"ok"}]}}\n\n', {
                headers: { "content-type": "text/event-stream" },
            }),
        );
        const client = new ModernMcpHttpClient({ url: "http://doris.test/mcp", fetchFn });

        await expect(client.request("tools/call", { name: "doris_query", arguments: {} })).resolves.toEqual({
            content: [{ type: "text", text: "ok" }],
        });
        expect((fetchFn.mock.calls[0][1]?.headers as Record<string, string>)["mcp-method"]).toBe("tools/call");
    });
});
