import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateAgentMemoryDto, UpdateAgentMemoryDto } from "../../dto/agent-memory.dto";
import { MemoryService } from "../../services/memory.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

@WebController("ai-agent-memories")
export class AgentMemoryWebController extends BaseController {
    constructor(private readonly memoryService: MemoryService) {
        super();
    }

    @Get()
    async list(@Query("limit") limitParam?: string, @Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        const limit = Math.min(
            Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
            MAX_LIMIT,
        );
        return this.memoryService.listAgentMemoriesForUser(user, limit);
    }

    @Get("agents")
    async agents(@Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        return this.memoryService.listAccessibleAgents(user);
    }

    @Post()
    async create(@Body() body: CreateAgentMemoryDto, @Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        return this.memoryService.createAgentMemoryForUser(user, body);
    }

    @Patch(":id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateAgentMemoryDto,
        @Playground() user?: UserPlayground,
    ) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        const memory = await this.memoryService.updateAgentMemoryForUser(id, user, body);
        if (!memory) throw HttpErrorFactory.notFound("记忆不存在或已删除");
        return memory;
    }

    @Delete("all")
    async clear(@Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        await this.memoryService.deactivateAllAgentMemories(user.id);
    }

    @Delete(":id")
    async remove(@Param("id") id: string, @Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        const memory = await this.memoryService.findAgentMemoryById(id, user.id);
        if (!memory) throw HttpErrorFactory.notFound("记忆不存在或已删除");
        await this.memoryService.deactivateAgentMemory(id, user.id);
    }
}
