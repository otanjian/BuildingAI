import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Agent, AgentChatRecord, AiMcpServer, AiMcpTool } from "@buildingai/db/entities";
import { TodoModule } from "@modules/todo/todo.module";
import { forwardRef, Module } from "@nestjs/common";
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
import { AutomationModule } from "../automation/automation.module";
import { AutomationBowiProvider } from "../automation/mcp/automation-bowi.provider";

@Module({
    imports: [
        TypeOrmModule.forFeature([Agent, AgentChatRecord, AiMcpServer, AiMcpTool]),
        DiscoveryModule,
        TodoModule,
        forwardRef(() => AutomationModule),
    ],
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
            inject: [PersonalTodoBowiProvider, SapBowiProvider, AutomationBowiProvider],
            useFactory: (
                todo: PersonalTodoBowiProvider,
                sap: SapBowiProvider,
                automation: AutomationBowiProvider,
            ) => [todo, sap, automation],
        },
        BowiMcpRegistry,
        BowiMcpRuntimeService,
        BowiMcpCatalogSyncService,
    ],
    exports: [BowiMcpRegistry, BowiMcpRuntimeService],
})
export class BowiMcpModule {}
