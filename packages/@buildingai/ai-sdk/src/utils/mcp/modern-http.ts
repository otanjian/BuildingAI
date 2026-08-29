import { dynamicTool, jsonSchema } from "@ai-sdk/provider-utils";

import type { McpToolInfo } from "./types";

export const MODERN_MCP_PROTOCOL_VERSION = "2026-07-28";

type JsonRpcResponse = {
    jsonrpc?: string;
    id?: string | number | null;
    result?: Record<string, unknown>;
    error?: { code?: number; message?: string; data?: unknown };
};

type ModernClientOptions = {
    url: string;
    headers?: Record<string, string>;
    name?: string;
    version?: string;
    fetchFn?: typeof fetch;
};

const MODERN_CLIENT_CAPABILITIES = {};

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
    return typeof value === "object" && value !== null && "jsonrpc" in value;
}

async function readResponse(response: Response): Promise<JsonRpcResponse> {
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
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
            const parsed: unknown = JSON.parse(candidate);
            if (isJsonRpcResponse(parsed)) return parsed;
        } catch {
            // Continue looking for the JSON-RPC frame in an SSE response.
        }
    }

    throw new Error(`Modern MCP endpoint returned no JSON-RPC response (${contentType || "unknown content type"})`);
}

export class ModernMcpHttpClient {
    private nextId = 1;

    private readonly fetchFn: typeof fetch;

    private readonly baseHeaders: Record<string, string>;

    constructor(private readonly options: ModernClientOptions) {
        this.fetchFn = options.fetchFn || fetch;
        this.baseHeaders = {
            ...(options.headers || {}),
            Accept: "application/json, text/event-stream",
            "Content-Type": "application/json",
            "mcp-protocol-version": MODERN_MCP_PROTOCOL_VERSION,
        };
    }

    async request(
        method: string,
        params: Record<string, unknown> = {},
        routingName?: string,
    ): Promise<Record<string, unknown>> {
        const id = this.nextId++;
        const response = await this.fetchFn(this.options.url, {
            method: "POST",
            headers: {
                ...this.baseHeaders,
                "mcp-method": method,
                ...(routingName ? { "mcp-name": routingName } : {}),
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id,
                method,
                params: {
                    ...params,
                    _meta: {
                        "io.modelcontextprotocol/protocolVersion": MODERN_MCP_PROTOCOL_VERSION,
                        "io.modelcontextprotocol/clientCapabilities": MODERN_CLIENT_CAPABILITIES,
                        "io.modelcontextprotocol/clientInfo": {
                            name: this.options.name || "buildingai",
                            version: this.options.version || "1.0.0",
                        },
                    },
                },
            }),
        });

        const message = await readResponse(response);
        if (!response.ok || message.error) {
            const details = message.error?.message || `${response.status} ${response.statusText}`;
            throw new Error(`Modern MCP request ${method} failed: ${details}`);
        }
        return message.result || {};
    }

    async listTools(): Promise<McpToolInfo[]> {
        const result = await this.request("tools/list");
        const tools = Array.isArray(result.tools) ? result.tools : [];
        return tools.flatMap((tool): McpToolInfo[] => {
            if (!tool || typeof tool !== "object" || typeof (tool as { name?: unknown }).name !== "string") {
                return [];
            }
            const candidate = tool as {
                name: string;
                description?: string;
                inputSchema?: Record<string, unknown>;
            };
            return [
                {
                    name: candidate.name,
                    description: candidate.description,
                    inputSchema: candidate.inputSchema,
                },
            ];
        });
    }

    async tools(): Promise<Record<string, unknown>> {
        const tools = await this.listTools();
        return Object.fromEntries(
            tools.map((tool) => [
                tool.name,
                dynamicTool({
                    description: tool.description,
                    inputSchema: jsonSchema(tool.inputSchema || { type: "object", properties: {} }),
                        execute: async (args: unknown) =>
                            this.request(
                                "tools/call",
                                {
                                    name: tool.name,
                                    arguments: args && typeof args === "object" ? args : {},
                                },
                                tool.name,
                            ),
                }),
            ]),
        );
    }

    async close(): Promise<void> {
        // Modern MCP is stateless and does not allocate a session to close.
    }
}
