import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { BowiMcpController } from "./bowi-mcp.controller";
import { BowiAppScopeService } from "./bowi-app-scope.service";
import { BowiCheckRunsService } from "./bowi-check-runs.service";
import { BowiMcpRuntimeService } from "./bowi-mcp-runtime.service";
import { BowiMcpToolSyncService } from "./bowi-mcp-tool-sync.service";
import { BowiMcpToolsExecutor } from "./bowi-mcp-tools.executor";
import { BowiSqlService } from "./bowi-sql.service";

@Module({
    imports: [TypeOrmModule.forFeature([AiMcpTool])],
    controllers: [BowiMcpController],
    providers: [
        BowiAppScopeService,
        BowiCheckRunsService,
        BowiSqlService,
        BowiMcpToolsExecutor,
        BowiMcpRuntimeService,
        BowiMcpToolSyncService,
    ],
    exports: [BowiMcpToolSyncService],
})
export class BowiMcpModule {}
