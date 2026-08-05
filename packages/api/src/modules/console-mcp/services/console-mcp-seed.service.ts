import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    AiMcpServer,
    McpCommunicationType,
    McpServerType,
} from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CONSOLE_MCP_SERVER_NAME } from "../catalog/console-mcp-tools.catalog";

@Injectable()
export class ConsoleMcpSeedService implements OnModuleInit {
    private readonly logger = new Logger(ConsoleMcpSeedService.name);

    constructor(
        @InjectRepository(AiMcpServer)
        private readonly mcpServerRepository: Repository<AiMcpServer>,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit(): Promise<void> {
        try {
            await this.ensureSystemServer();
        } catch (error) {
            this.logger.warn(
                `Failed to seed ${CONSOLE_MCP_SERVER_NAME}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    private resolveUrl(): string {
        const configured = this.configService.get<string>("CONSOLE_MCP_URL")?.trim();
        if (configured) {
            return configured;
        }
        const domain = this.configService.get<string>("APP_DOMAIN")?.trim()?.replace(/\/$/, "");
        if (domain) {
            return `${domain}/mcp/${CONSOLE_MCP_SERVER_NAME}`;
        }
        return `http://127.0.0.1:4090/mcp/${CONSOLE_MCP_SERVER_NAME}`;
    }

    private async ensureSystemServer(): Promise<void> {
        const existing = await this.mcpServerRepository.findOne({
            where: { name: CONSOLE_MCP_SERVER_NAME },
        });
        const url = this.resolveUrl();

        if (existing) {
            if (existing.url !== url || existing.communicationType !== McpCommunicationType.STREAMABLEHTTP) {
                existing.url = url;
                existing.communicationType = McpCommunicationType.STREAMABLEHTTP;
                existing.type = McpServerType.SYSTEM;
                existing.description =
                    existing.description ||
                    "Bowi AI console control-plane MCP (permission-gated tools)";
                await this.mcpServerRepository.save(existing);
                this.logger.log(`Updated system MCP server ${CONSOLE_MCP_SERVER_NAME}`);
            }
            return;
        }

        const entity = this.mcpServerRepository.create({
            name: CONSOLE_MCP_SERVER_NAME,
            alias: "Console MCP",
            description: "Bowi AI console control-plane MCP (permission-gated tools)",
            type: McpServerType.SYSTEM,
            url,
            communicationType: McpCommunicationType.STREAMABLEHTTP,
            isDisabled: false,
            connectable: true,
            sortOrder: 0,
        });
        await this.mcpServerRepository.save(entity);
        this.logger.log(`Seeded system MCP server ${CONSOLE_MCP_SERVER_NAME}`);
    }
}
