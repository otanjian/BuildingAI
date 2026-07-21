import { type UserPlayground } from "@buildingai/db";
import { AgentsService } from "@modules/ai/agents/services/agents.service";
import { CreateAgentDto } from "@modules/ai/agents/dto/web/agent/create-agent.dto";
import { ListConsoleAgentsDto } from "@modules/ai/agents/dto/list-console-agents.dto";
import { AiMcpServerService } from "@modules/ai/mcp/services/ai-mcp-server.service";
import { QueryAiMcpServerDto } from "@modules/ai/mcp/dto/ai-mcp-server.dto";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
    CONSOLE_MCP_TOOL_CATALOG,
    filterConsoleMcpToolsForUser,
    userCanCallConsoleMcpTool,
    type ConsoleMcpToolDefinition,
} from "../catalog/console-mcp-tools.catalog";

export type ConsoleMcpToolErrorCode =
    | "permission_denied"
    | "invalid_params"
    | "internal_error"
    | "not_found";

export class ConsoleMcpToolError extends Error {
    constructor(
        public readonly code: ConsoleMcpToolErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "ConsoleMcpToolError";
    }
}

@Injectable()
export class ConsoleMcpToolsService {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly aiMcpServerService: AiMcpServerService,
    ) {}

    listToolsForUser(user: UserPlayground): ConsoleMcpToolDefinition[] {
        return filterConsoleMcpToolsForUser(CONSOLE_MCP_TOOL_CATALOG, {
            isRoot: user.isRoot,
            permissions: user.permissions ?? [],
        });
    }

    async callTool(
        user: UserPlayground,
        name: string,
        args: Record<string, unknown> | undefined,
    ): Promise<unknown> {
        const tool = CONSOLE_MCP_TOOL_CATALOG.find((t) => t.name === name);
        if (!tool) {
            throw new ConsoleMcpToolError("not_found", `Unknown tool: ${name}`);
        }

        if (
            !userCanCallConsoleMcpTool(tool, {
                isRoot: user.isRoot,
                permissions: user.permissions ?? [],
            })
        ) {
            throw new ConsoleMcpToolError(
                "permission_denied",
                `Missing permission for tool: ${name}`,
            );
        }

        try {
            switch (name) {
                case "console_list_agents":
                    return this.listAgents(args);
                case "console_list_mcp_servers":
                    return this.listMcpServers(args);
                case "create_agent":
                    return this.createAgent(user, args);
                default:
                    throw new ConsoleMcpToolError("not_found", `Unknown tool: ${name}`);
            }
        } catch (error) {
            if (error instanceof ConsoleMcpToolError) {
                throw error;
            }
            if (error && typeof error === "object" && "status" in error) {
                throw error;
            }
            throw new ConsoleMcpToolError(
                "internal_error",
                error instanceof Error ? error.message : "Internal error",
            );
        }
    }

    private async listAgents(args: Record<string, unknown> | undefined) {
        const dto = plainToInstance(ListConsoleAgentsDto, args ?? {});
        const errors = await validate(dto);
        if (errors.length > 0) {
            throw new ConsoleMcpToolError("invalid_params", "Invalid list agents parameters");
        }
        return this.agentsService.listForConsole(dto);
    }

    private async listMcpServers(args: Record<string, unknown> | undefined) {
        const dto = plainToInstance(QueryAiMcpServerDto, args ?? {});
        const errors = await validate(dto);
        if (errors.length > 0) {
            throw new ConsoleMcpToolError("invalid_params", "Invalid list MCP servers parameters");
        }
        return this.aiMcpServerService.list(dto);
    }

    private async createAgent(user: UserPlayground, args: Record<string, unknown> | undefined) {
        const dto = plainToInstance(CreateAgentDto, args ?? {});
        const errors = await validate(dto);
        if (errors.length > 0) {
            throw new ConsoleMcpToolError("invalid_params", "Invalid create agent parameters");
        }
        const agent = await this.agentsService.createAgent(user, dto);
        return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            createMode: agent.createMode,
            createdAt: agent.createdAt,
        };
    }
}
