import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Agent, AgentAssignment, AgentMemory, UserMemory } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { AgentMemoryWebController } from "./controllers/web/agent-memory.controller";
import { UserMemoryWebController } from "./controllers/web/user-memory.controller";
import { MemoryService } from "./services/memory.service";
import { MemoryExtractionService } from "./services/memory-extraction.service";

@Module({
    imports: [TypeOrmModule.forFeature([UserMemory, AgentMemory, Agent, AgentAssignment])],
    controllers: [UserMemoryWebController, AgentMemoryWebController],
    providers: [MemoryService, MemoryExtractionService],
    exports: [MemoryService, MemoryExtractionService],
})
export class AiMemoryModule {}
