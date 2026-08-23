import { BOWI_MCP_TOOL_CATALOG } from "@buildingai/constants/shared/bowi-mcp.constant";
import { Injectable } from "@nestjs/common";

import { BowiMcpToolsExecutor } from "./bowi-mcp-tools.executor";

@Injectable()
export class EhcsBowiMcpProvider {
    readonly bowiMcpProvider = true as const;
    readonly namespace = "ehcs";
    readonly tools;

    constructor(private readonly executor: BowiMcpToolsExecutor) {
        this.tools = BOWI_MCP_TOOL_CATALOG.map((definition) => ({
            ...definition,
            inputSchema: { ...definition.inputSchema, additionalProperties: false as const },
            capability: "ehcs.operator" as const,
            execute: (arguments_: Record<string, unknown>) =>
                this.executor.call(definition.name, arguments_),
        }));
    }
}
