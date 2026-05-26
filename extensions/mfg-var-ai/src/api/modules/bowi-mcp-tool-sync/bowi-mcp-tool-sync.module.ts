import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpTool } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { BowiMcpToolSyncService } from "./bowi-mcp-tool-sync.service";

@Module({
    imports: [TypeOrmModule.forFeature([AiMcpTool])],
    providers: [BowiMcpToolSyncService],
    exports: [BowiMcpToolSyncService],
})
export class BowiMcpToolSyncModule {}
