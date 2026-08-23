import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatRecord, AiMcpServer, AiMcpTool } from "@buildingai/db/entities";
import { TodoModule } from "@modules/todo/todo.module";
import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { BowiMcpController } from "./controllers/bowi-mcp.controller";
import { BowiMcpCatalogSyncService } from "./services/bowi-mcp-catalog-sync.service";
import { BowiMcpPrincipalService } from "./services/bowi-mcp-principal.service";
import { BowiMcpRegistry } from "./services/bowi-mcp-registry.service";
import { BowiMcpRuntimeService } from "./services/bowi-mcp-runtime.service";
import { BOWI_MCP_PROVIDER_TOKEN } from "./types/bowi-mcp.types";
import { SapAdtMcpAdapter } from "./sap/sap-adt-mcp.adapter";
import { SapBowiProvider } from "./sap/sap-bowi.provider";
import { SapConnectionProfileService } from "./sap/sap-connection-profile.service";
import { SapPyrfcMcpAdapter } from "./sap/sap-pyrfc-mcp.adapter";
import { StreamableMcpClient } from "./sap/streamable-mcp-client";
import { PersonalTodoBowiProvider } from "../todo/mcp/personal-todo-bowi.provider";

@Module({
    imports: [TypeOrmModule.forFeature([AgentChatRecord, AiMcpServer, AiMcpTool]), DiscoveryModule, TodoModule],
    controllers: [BowiMcpController],
    providers: [
        BowiMcpPrincipalService,
        StreamableMcpClient,
        SapConnectionProfileService,
        SapAdtMcpAdapter,
        SapPyrfcMcpAdapter,
        SapBowiProvider,
        {
            provide: BOWI_MCP_PROVIDER_TOKEN,
            inject: [PersonalTodoBowiProvider, SapBowiProvider],
            useFactory: (todo: PersonalTodoBowiProvider, sap: SapBowiProvider) => [todo, sap],
        },
        BowiMcpRegistry,
        BowiMcpRuntimeService,
        BowiMcpCatalogSyncService,
    ],
    exports: [BowiMcpRegistry, BowiMcpRuntimeService],
})
export class BowiMcpModule {}
