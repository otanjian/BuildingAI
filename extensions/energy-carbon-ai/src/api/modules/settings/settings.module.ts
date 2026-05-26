import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { AiMcpServer } from "@buildingai/db/entities/ai-mcp-server.entity";
import { AiModel } from "@buildingai/db/entities/ai-model.entity";

import { BowiMcpToolSyncModule } from "../bowi-mcp-tool-sync/bowi-mcp-tool-sync.module";
import { AppSettings } from "../../db/entities/app-settings.entity";
import { SettingsConsoleController } from "./controllers/console/settings.controller";
import { EnergyCarbonPlatformAgentService } from "./services/energy-carbon-platform-agent.service";
import { SettingsService } from "./services/settings.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([AppSettings, Agent, AiModel, AiMcpServer]),
        BowiMcpToolSyncModule,
    ],
    controllers: [SettingsConsoleController],
    providers: [SettingsService, EnergyCarbonPlatformAgentService],
    exports: [SettingsService, EnergyCarbonPlatformAgentService],
})
export class SettingsModule {}
