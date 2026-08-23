import { HttpError } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { BowiMcpPrincipalService } from "./bowi-mcp-principal.service";
import {
    BowiMcpRegistry,
    BowiToolAuthorizationError,
    BowiToolExecutionError,
    BowiToolInputError,
} from "./bowi-mcp-registry.service";
import type { BowiInvocationMeta } from "../types/bowi-mcp.types";

export interface BowiJsonRpcRequest {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: {
        name?: unknown;
        arguments?: unknown;
        _meta?: BowiInvocationMeta;
        protocolVersion?: unknown;
    };
}

type Headers = Record<string, string | string[] | undefined>;

@Injectable()
export class BowiMcpRuntimeService {
    constructor(
        private readonly registry: BowiMcpRegistry,
        private readonly principals: BowiMcpPrincipalService,
    ) {}

    async dispatch(message: BowiJsonRpcRequest, headers: Headers): Promise<Record<string, unknown>> {
        const id = message.id ?? null;
        if (message.jsonrpc !== "2.0" || !message.method) {
            return this.protocolError(id, -32600, "Invalid Request");
        }

        switch (message.method) {
            case "initialize":
                await this.principals.resolve({ headers, requireSubject: false });
                return this.success(id, {
                    protocolVersion:
                        typeof message.params?.protocolVersion === "string"
                            ? message.params.protocolVersion
                            : "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "bowi-mcp", version: "2.0.0" },
                    instructions:
                        "Bowi AI business tools. Personal Todo tools always act as the verified current user.",
                });
            case "notifications/initialized":
            case "ping":
                await this.principals.resolve({ headers, requireSubject: false });
                return this.success(id, {});
            case "tools/list":
                return this.success(id, {
                    tools: this.registry.list(
                        await this.principals.resolve({ headers, requireSubject: false }),
                    ),
                });
            case "tools/call":
                return this.callTool(id, message.params, headers);
            default:
                return this.protocolError(id, -32601, `Method not found: ${message.method}`);
        }
    }

    private async callTool(
        id: string | number | null,
        params: BowiJsonRpcRequest["params"],
        headers: Headers,
    ): Promise<Record<string, unknown>> {
        const name = typeof params?.name === "string" ? params.name.trim() : "";
        if (!name) return this.protocolError(id, -32602, "Invalid params: tool name is required");
        if (!this.registry.get(name)) return this.protocolError(id, -32601, `Unknown tool: ${name}`);

        try {
            const principal = await this.principals
                .resolve({
                    headers,
                    meta: params?._meta,
                    requireSubject: name.startsWith("todo_") || name.startsWith("sap_"),
                })
                .catch(() => {
                    throw new BowiToolAuthorizationError("Bowi principal resolution failed");
                });
            const data = await this.registry.execute(name, params?.arguments ?? {}, principal);
            const structured = this.structured(data);
            return this.success(id, {
                content: [{ type: "text", text: JSON.stringify(data) }],
                structuredContent: structured,
            });
        } catch (error) {
            const mapped = this.mapToolError(error);
            return this.success(id, {
                isError: true,
                content: [{ type: "text", text: mapped.message }],
                structuredContent: { error: mapped },
            });
        }
    }

    private mapToolError(error: unknown): { code: string; message: string } {
        if (error instanceof BowiToolInputError) {
            return { code: "BOWI_INVALID_ARGUMENTS", message: error.message };
        }
        if (error instanceof BowiToolAuthorizationError) {
            return { code: "BOWI_FORBIDDEN", message: "Bowi tool access denied" };
        }
        if (error instanceof BowiToolExecutionError) {
            return { code: error.code, message: error.message };
        }
        if (error instanceof HttpError) {
            if (error.httpStatus === 404) return { code: "TODO_NOT_FOUND", message: "Todo not found" };
            if (error.httpStatus === 409) return { code: "TODO_STALE_UPDATE", message: error.message };
            if (error.httpStatus === 401 || error.httpStatus === 403) {
                return { code: "BOWI_FORBIDDEN", message: "Bowi tool access denied" };
            }
            if (error.httpStatus >= 400 && error.httpStatus < 500) {
                return { code: "BOWI_INVALID_ARGUMENTS", message: error.message };
            }
        }
        return {
            code: "BOWI_TOOL_ERROR",
            message: "Bowi tool execution failed",
        };
    }

    private structured(value: unknown): Record<string, unknown> {
        return value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : { value };
    }

    private success(id: string | number | null, result: Record<string, unknown>) {
        return { jsonrpc: "2.0", id, result };
    }

    private protocolError(id: string | number | null, code: number, message: string) {
        return { jsonrpc: "2.0", id, error: { code, message } };
    }
}
