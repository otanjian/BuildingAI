import { BOWI_MCP_TOOL_CATALOG } from "@buildingai/constants/shared/bowi-mcp.constant";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Persists bowi-mcp tool definitions to platform ai_mcp_tool rows.
 */
@Injectable()
export class BowiMcpToolSyncService {
    private readonly logger = new Logger(BowiMcpToolSyncService.name);

    constructor(
        @InjectRepository(AiMcpTool)
        private readonly mcpToolRepo: Repository<AiMcpTool>,
    ) {}

    async syncCatalogToDatabase(mcpServerId: string): Promise<number> {
        const tools = BOWI_MCP_TOOL_CATALOG.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        }));

        const existing = await this.mcpToolRepo.find({ where: { mcpServerId } });
        const existingMap = new Map(existing.map((row) => [row.name, row]));
        const newNames = new Set(tools.map((t) => t.name));

        for (const tool of tools) {
            const row = existingMap.get(tool.name);
            if (row) {
                await this.mcpToolRepo.update(row.id, {
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
            } else {
                await this.mcpToolRepo.save({
                    mcpServerId,
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
            }
        }

        for (const row of existing) {
            if (!newNames.has(row.name)) {
                await this.mcpToolRepo.delete(row.id);
            }
        }

        this.logger.log(`Synced ${tools.length} bowi-mcp tools for server ${mcpServerId}`);
        return tools.length;
    }
}
