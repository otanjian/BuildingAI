import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

import { MODERN_MCP_PROTOCOL_VERSION, ModernMcpHttpClient } from "./modern-http";
import type { CreateMcpClientOptions, McpClient, McpToolInfo } from "./types";

export type McpProtocolDetection =
    | { protocol: "modern"; supportedVersions: string[] }
    | { protocol: "legacy"; reason?: string };

function parseJsonRpcBody(body: string, contentType: string): unknown {
    const eventCandidates = body
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);
    const candidates = contentType.includes("text/event-stream")
        ? [...eventCandidates, body]
        : [body, ...eventCandidates];

    for (const candidate of candidates.reverse()) {
        try {
            return JSON.parse(candidate) as unknown;
        } catch {
            // A legacy endpoint may return HTML/plain text or an incomplete SSE
            // frame. Those responses should retain the legacy compatibility path.
        }
    }
    return undefined;
}

/**
 * Probe an HTTP MCP endpoint without assuming that it supports the modern
 * protocol. Only an explicit supported-version advertisement selects modern
 * transport; all other responses retain the existing AI SDK transport.
 */
export async function detectMcpProtocol(
    url: string,
    headers: Record<string, string> | undefined,
    name: string | undefined,
    version: string | undefined,
    fetchFn: typeof fetch = fetch,
): Promise<McpProtocolDetection> {
    try {
        const response = await fetchFn(url, {
            method: "POST",
            headers: {
                ...(headers || {}),
                Accept: "application/json, text/event-stream",
                "Content-Type": "application/json",
                "mcp-protocol-version": MODERN_MCP_PROTOCOL_VERSION,
                "mcp-method": "server/discover",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 0,
                method: "server/discover",
                params: {
                    _meta: {
                        "io.modelcontextprotocol/protocolVersion": MODERN_MCP_PROTOCOL_VERSION,
                        "io.modelcontextprotocol/clientCapabilities": {},
                        "io.modelcontextprotocol/clientInfo": {
                            name: name || "buildingai",
                            version: version || "1.0.0",
                        },
                    },
                },
            }),
        });

        if (!response.ok) {
            return { protocol: "legacy", reason: `discovery returned HTTP ${response.status}` };
        }

        const payload = parseJsonRpcBody(
            await response.text(),
            response.headers.get("content-type") || "",
        );
        const supportedVersions =
            typeof payload === "object" && payload !== null && "result" in payload
                ? (payload.result as { supportedVersions?: unknown } | undefined)?.supportedVersions
                : undefined;

        if (
            Array.isArray(supportedVersions) &&
            supportedVersions.every((candidate): candidate is string => typeof candidate === "string") &&
            supportedVersions.includes(MODERN_MCP_PROTOCOL_VERSION)
        ) {
            return { protocol: "modern", supportedVersions };
        }

        return { protocol: "legacy", reason: "endpoint did not advertise the requested protocol version" };
    } catch {
        return { protocol: "legacy", reason: "modern protocol discovery was unavailable" };
    }
}

/**
 * 创建 MCP 客户端
 *
 * @param options 客户端创建选项
 * @returns MCP 客户端实例
 */
export async function createMcpClient(options: CreateMcpClientOptions): Promise<McpClient> {
    const { transport, name, version, fetchFn } = options;

    let mcpTransport: Parameters<typeof createMCPClient>[0]["transport"];

    switch (transport.type) {
        case "sse": {
            mcpTransport = {
                type: "sse" as const,
                url: transport.url,
                ...(transport.headers && { headers: transport.headers }),
                ...(fetchFn && { fetch: fetchFn }),
            };
            break;
        }
        case "http": {
            const protocol = await detectMcpProtocol(
                transport.url,
                transport.headers,
                name,
                version,
                fetchFn,
            );
            if (protocol.protocol === "modern") {
                const modernClient = new ModernMcpHttpClient({
                    url: transport.url,
                    headers: transport.headers,
                    name,
                    version,
                    fetchFn,
                });
                return {
                    tools: () => modernClient.tools(),
                    listTools: () => modernClient.listTools(),
                    close: () => modernClient.close(),
                };
            }
            mcpTransport = {
                type: "http" as const,
                url: transport.url,
                ...(transport.headers && { headers: transport.headers }),
                ...(fetchFn && { fetch: fetchFn }),
            };
            break;
        }
        case "stdio": {
            mcpTransport = new Experimental_StdioMCPTransport({
                command: transport.command,
                args: transport.args,
                ...(transport.env && { env: transport.env }),
            });
            break;
        }
        case "custom": {
            mcpTransport = transport.transport as Parameters<
                typeof createMCPClient
            >[0]["transport"];
            break;
        }
        default: {
            const _exhaustive: never = transport;
            throw new Error(`Unsupported transport type: ${JSON.stringify(_exhaustive)}`);
        }
    }

    const client = await createMCPClient({
        transport: mcpTransport,
        ...(name && { name }),
        ...(version && { version }),
    });

    return {
        tools: async () => await client.tools(),
        listTools: async (): Promise<McpToolInfo[]> => {
            const result = await client.listTools();
            return result.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
            }));
        },
        close: async () => await client.close(),
    };
}
