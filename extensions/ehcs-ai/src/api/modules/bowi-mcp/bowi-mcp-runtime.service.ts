import { BOWI_MCP_TOOL_CATALOG } from "@buildingai/constants/shared/bowi-mcp.constant";
import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";

import { BowiMcpToolsExecutor } from "./bowi-mcp-tools.executor";

type JsonRpcRequest = {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
};

type JsonRpcError = {
    code: number;
    message: string;
    data?: unknown;
};

const SERVER_INSTRUCTIONS =
    "Unified BuildingAI enterprise MCP. Every tool call MUST include appId. SQL and check runs are scoped to that app's schema only.";

@Injectable()
export class BowiMcpRuntimeService {
    constructor(private readonly executor: BowiMcpToolsExecutor) {}

    async handleHttp(req: Request, res: Response, parsedBody?: unknown): Promise<void> {
        const accept = req.headers.accept ?? "";
        if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
            res.status(406).json(this.errorResponse(null, {
                code: -32000,
                message: "Not Acceptable: Client must accept both application/json and text/event-stream",
            }));
            return;
        }

        const contentType = req.headers["content-type"] ?? "";
        if (!contentType.includes("application/json")) {
            res.status(415).json(this.errorResponse(null, {
                code: -32000,
                message: "Unsupported Media Type: Content-Type must be application/json",
            }));
            return;
        }

        const messages = this.normalizeMessages(parsedBody ?? req.body);
        if (messages.length === 0) {
            res.status(400).json(this.errorResponse(null, {
                code: -32600,
                message: "Invalid Request",
            }));
            return;
        }

        const responses = await Promise.all(messages.map((message) => this.dispatch(message)));
        const payload = responses.length === 1 ? responses[0] : responses;
        res.status(200).json(payload);
    }

    private normalizeMessages(body: unknown): JsonRpcRequest[] {
        if (Array.isArray(body)) {
            return body.filter((item): item is JsonRpcRequest => this.isObject(item));
        }
        return this.isObject(body) ? [body] : [];
    }

    private isObject(value: unknown): value is JsonRpcRequest {
        return typeof value === "object" && value !== null;
    }

    private async dispatch(message: JsonRpcRequest): Promise<Record<string, unknown>> {
        const id = message.id ?? null;
        const method = message.method;
        if (!method) {
            return this.errorResponse(id, { code: -32600, message: "Invalid Request" });
        }

        try {
            switch (method) {
                case "initialize":
                    return this.successResponse(id, {
                        protocolVersion:
                            (message.params?.protocolVersion as string | undefined) ??
                            "2024-11-05",
                        capabilities: { tools: {} },
                        serverInfo: { name: "bowi-mcp", version: "1.0.0" },
                        instructions: SERVER_INSTRUCTIONS,
                    });
                case "notifications/initialized":
                    return this.successResponse(id, {});
                case "tools/list":
                    return this.successResponse(id, {
                        tools: BOWI_MCP_TOOL_CATALOG.map((t) => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema,
                        })),
                    });
                case "tools/call": {
                    const params = message.params ?? {};
                    const name = params.name;
                    const args = params.arguments;
                    if (typeof name !== "string" || !name.trim()) {
                        return this.errorResponse(id, {
                            code: -32602,
                            message: "Invalid params: tool name is required",
                        });
                    }
                    const result = await this.executor.call(
                        name,
                        this.isObject(args) ? args : undefined,
                    );
                    return this.successResponse(id, {
                        content: [{ type: "text", text: JSON.stringify(result) }],
                        structuredContent:
                            result && typeof result === "object"
                                ? (result as Record<string, unknown>)
                                : { value: result },
                    });
                }
                case "ping":
                    return this.successResponse(id, {});
                default:
                    return this.errorResponse(id, {
                        code: -32601,
                        message: `Method not found: ${method}`,
                    });
            }
        } catch (error) {
            return this.errorResponse(id, {
                code: -32603,
                message: error instanceof Error ? error.message : "Internal error",
            });
        }
    }

    private successResponse(
        id: string | number | null,
        result: Record<string, unknown>,
    ): Record<string, unknown> {
        return { jsonrpc: "2.0", id, result };
    }

    private errorResponse(
        id: string | number | null,
        error: JsonRpcError,
    ): Record<string, unknown> {
        return { jsonrpc: "2.0", id, error };
    }
}
