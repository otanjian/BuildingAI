import { Injectable } from "@nestjs/common";

import { BowiToolExecutionError } from "../services/bowi-mcp-registry.service";
import type { BowiPrincipal } from "../types/bowi-mcp.types";
import { SapConnectionProfileService } from "./sap-connection-profile.service";
import { StreamableMcpClient } from "./streamable-mcp-client";

@Injectable()
export class SapAdtMcpAdapter {
    constructor(
        private readonly profiles: SapConnectionProfileService,
        private readonly mcp: StreamableMcpClient,
    ) {}

    async call(
        principal: BowiPrincipal,
        upstreamTool: string,
        arguments_: Record<string, unknown>,
    ): Promise<unknown> {
        this.profiles.requireAdtServiceProfile(principal);
        return this.mcp.call(this.url(), upstreamTool, arguments_);
    }

    async updateObjectSource(
        principal: BowiPrincipal,
        arguments_: { objectSourceUrl: string; source: string; transport?: unknown },
    ): Promise<unknown> {
        this.profiles.requireAdtServiceProfile(principal);
        return this.mcp.withSession(this.url(), async (session) => {
            const locked = await session.call("lock", {
                objectUrl: arguments_.objectSourceUrl,
                accessMode: "MODIFY",
            });
            const lockHandle = this.stringField(locked, "lockHandle");
            if (!lockHandle) {
                throw new BowiToolExecutionError(
                    "SAP_UPSTREAM_REJECTED",
                    "SAP upstream did not return an object lock",
                );
            }
            try {
                return await session.call("setObjectSource", {
                    objectSourceUrl: arguments_.objectSourceUrl,
                    source: arguments_.source,
                    lockHandle,
                    ...(arguments_.transport === undefined
                        ? {}
                        : { transport: arguments_.transport }),
                });
            } finally {
                await session
                    .call("unLock", {
                        objectUrl: arguments_.objectSourceUrl,
                        lockHandle,
                    })
                    .catch(() => undefined);
            }
        });
    }

    private url(): string {
        return process.env.BOWI_SAP_ADT_MCP_URL?.trim() || "http://127.0.0.1:8100/mcp";
    }

    private stringField(value: unknown, key: string): string | undefined {
        if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
        const field = (value as Record<string, unknown>)[key];
        return typeof field === "string" && field.trim() ? field.trim() : undefined;
    }
}
