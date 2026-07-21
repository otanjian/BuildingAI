import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpServer, ConsoleMcpApiKey, User } from "@buildingai/db/entities";
import { AuthModule } from "@modules/auth/auth.module";
import { AiAgentsModule } from "@modules/ai/agents/agents.module";
import { AiMcpModule } from "@modules/ai/mcp/ai-mcp.module";
import { Module } from "@nestjs/common";

import { ConsoleMcpController } from "./controllers/console-mcp.controller";
import { ConsoleMcpApiKeyConsoleController } from "./controllers/console/console-mcp-api-key.controller";
import { ConsoleMcpKeyGuard } from "./guards/console-mcp-key.guard";
import { ConsoleMcpApiKeyService } from "./services/console-mcp-api-key.service";
import { ConsoleMcpRuntimeService } from "./services/console-mcp-runtime.service";
import { ConsoleMcpSeedService } from "./services/console-mcp-seed.service";
import { ConsoleMcpToolsService } from "./services/console-mcp-tools.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([ConsoleMcpApiKey, User, AiMcpServer]),
        AuthModule,
        AiAgentsModule,
        AiMcpModule,
    ],
    controllers: [ConsoleMcpController, ConsoleMcpApiKeyConsoleController],
    providers: [
        ConsoleMcpApiKeyService,
        ConsoleMcpKeyGuard,
        ConsoleMcpToolsService,
        ConsoleMcpRuntimeService,
        ConsoleMcpSeedService,
    ],
    exports: [ConsoleMcpApiKeyService],
})
export class ConsoleMcpModule {}
