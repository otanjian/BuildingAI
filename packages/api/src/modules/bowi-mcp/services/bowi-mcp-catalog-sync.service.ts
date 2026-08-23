import { BOWI_MCP_SERVER_NAME } from "@buildingai/constants/shared/bowi-mcp.constant";
import { McpCommunicationType, McpServerType } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpServer, AiMcpTool } from "@buildingai/db/entities";
import type { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";

import { BowiMcpRegistry } from "./bowi-mcp-registry.service";
import type { BowiMcpProvider } from "../types/bowi-mcp.types";

@Injectable()
export class BowiMcpCatalogSyncService implements OnApplicationBootstrap {
    private readonly logger = new Logger(BowiMcpCatalogSyncService.name);

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly registry: BowiMcpRegistry,
        @InjectRepository(AiMcpServer)
        private readonly serverRepository: Repository<AiMcpServer>,
        @InjectRepository(AiMcpTool)
        private readonly toolRepository: Repository<AiMcpTool>,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const providers = this.discovery
            .getProviders()
            .map((wrapper) => wrapper.instance as BowiMcpProvider | undefined)
            .filter((provider): provider is BowiMcpProvider => provider?.bowiMcpProvider === true);
        for (const provider of providers) this.registry.register(provider);

        const hasEhcs = providers.some((provider) => provider.namespace === "ehcs");
        const existing = await this.serverRepository.findOne({ where: { name: BOWI_MCP_SERVER_NAME } });
        const existingIsLegacy = existing && !existing.url?.includes("/mcp/bowi-mcp");
        if (!hasEhcs && existingIsLegacy) {
            this.logger.warn(
                "EHCS Bowi provider was not discovered; preserving the existing canonical bowi-mcp URL",
            );
            return;
        }

        const canonical = existing ?? this.serverRepository.create({ name: BOWI_MCP_SERVER_NAME });
        Object.assign(canonical, {
            name: BOWI_MCP_SERVER_NAME,
            alias: "Bowi AI Business Tools",
            description: "Unified Bowi AI business MCP gateway",
            type: McpServerType.SYSTEM,
            creatorId: null,
            url: this.publicUrl(),
            communicationType: McpCommunicationType.STREAMABLEHTTP,
            headers: {},
            isDisabled: false,
            connectable: true,
            connectError: "",
            sortOrder: 0,
        });
        const server = await this.serverRepository.save(canonical);
        const current = await this.toolRepository.find({ where: { mcpServerId: server.id } });
        const byName = new Map(current.map((row) => [row.name, row]));
        for (const tool of this.registry.list()) {
            const row = byName.get(tool.name);
            if (row) {
                await this.toolRepository.update(row.id, {
                    description: tool.description,
                    inputSchema: tool.inputSchema as NonNullable<AiMcpTool["inputSchema"]>,
                });
            } else {
                await this.toolRepository.save({
                    mcpServerId: server.id,
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                });
            }
        }
        this.logger.log(`Synchronized ${this.registry.list().length} Bowi MCP tools`);
    }

    private publicUrl(): string {
        const base =
            process.env.BOWI_MCP_BASE_URL?.trim() ||
            process.env.VITE_PRODUCTION_APP_BASE_URL?.trim() ||
            process.env.VITE_DEVELOP_APP_BASE_URL?.trim() ||
            `http://127.0.0.1:${process.env.SERVER_PORT || "4090"}`;
        const prefix = (process.env.VITE_APP_WEB_API_PREFIX || "/api").replace(/\/$/, "");
        return `${base.replace(/\/$/, "")}${prefix}/mcp/bowi-mcp`;
    }
}
