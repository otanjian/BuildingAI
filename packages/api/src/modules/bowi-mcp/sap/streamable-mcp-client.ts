import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Inject, Injectable, Optional } from "@nestjs/common";

import { BowiToolExecutionError } from "../services/bowi-mcp-registry.service";

type ClientLike = Pick<Client, "connect" | "callTool" | "close">;
type TransportLike = StreamableHTTPClientTransport;
type ClientFactory = (url: URL) => { client: ClientLike; transport: TransportLike };

export interface StreamableMcpSession {
    call(tool: string, arguments_: Record<string, unknown>): Promise<unknown>;
}

export const STREAMABLE_MCP_CLIENT_FACTORY = Symbol("STREAMABLE_MCP_CLIENT_FACTORY");
export const STREAMABLE_MCP_CLIENT_TIMEOUT = Symbol("STREAMABLE_MCP_CLIENT_TIMEOUT");

export class SapUpstreamError extends BowiToolExecutionError {}

@Injectable()
export class StreamableMcpClient {
    private readonly factory: ClientFactory;
    private readonly timeoutMs: number;

    constructor(
        @Optional() @Inject(STREAMABLE_MCP_CLIENT_FACTORY) factory?: ClientFactory,
        @Optional() @Inject(STREAMABLE_MCP_CLIENT_TIMEOUT) timeoutMs?: number,
    ) {
        this.factory = factory ?? ((url) => ({
            client: new Client({ name: "bowi-sap-adapter", version: "1.0.0" }),
            transport: new StreamableHTTPClientTransport(url, {
                reconnectionOptions: {
                    initialReconnectionDelay: 250,
                    maxReconnectionDelay: 1_000,
                    reconnectionDelayGrowFactor: 1.5,
                    maxRetries: 1,
                },
            }),
        }));
        this.timeoutMs = timeoutMs ?? StreamableMcpClient.configuredTimeout();
    }

    async call(url: string, tool: string, arguments_: Record<string, unknown>): Promise<unknown> {
        return this.withSession(url, (session) => session.call(tool, arguments_));
    }

    async withSession<T>(
        url: string,
        operation: (session: StreamableMcpSession) => Promise<T>,
    ): Promise<T> {
        let client: ClientLike | undefined;
        let transport: TransportLike | undefined;
        try {
            const created = this.factory(new URL(url));
            client = created.client;
            transport = created.transport;
            await client.connect(transport, { timeout: this.timeoutMs });
            const session: StreamableMcpSession = {
                call: async (tool, arguments_) => {
                    const result = await client!.callTool(
                        { name: tool, arguments: arguments_ },
                        undefined,
                        { timeout: this.timeoutMs, maxTotalTimeout: this.timeoutMs },
                    );
                    if (result.isError) {
                        throw new SapUpstreamError(
                            "SAP_UPSTREAM_REJECTED",
                            "SAP upstream rejected the tool call",
                        );
                    }
                    return this.resultData(result);
                },
            };
            return await operation(session);
        } catch (error) {
            if (error instanceof BowiToolExecutionError) throw error;
            throw new SapUpstreamError("SAP_UPSTREAM_UNAVAILABLE", "SAP upstream is unavailable");
        } finally {
            await transport?.terminateSession?.().catch(() => undefined);
            await client?.close().catch(() => undefined);
        }
    }

    private resultData(result: { structuredContent?: unknown; content?: unknown }): unknown {
        if (result.structuredContent !== undefined) return result.structuredContent;
        if (!Array.isArray(result.content)) return {};
        const text = result.content
            .filter((item): item is { type: "text"; text: string } =>
                Boolean(item && typeof item === "object" && (item as { type?: unknown }).type === "text"),
            )
            .map((item) => item.text)
            .join("\n");
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return { text };
        }
    }

    private static configuredTimeout(): number {
        const configured = Number(process.env.BOWI_SAP_MCP_TIMEOUT_MS || 15_000);
        return Number.isFinite(configured) && configured >= 100 ? configured : 15_000;
    }
}
