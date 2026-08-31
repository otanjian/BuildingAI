import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateUserMemoryDto, UpdateUserMemoryDto } from "../../dto/user-memory.dto";
import { MemoryService } from "../../services/memory.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

@WebController("ai-memories")
export class UserMemoryWebController extends BaseController {
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
        return this.memoryService.getUserMemories(user.id, limit);
    }

    @Post()
    async create(@Body() body: CreateUserMemoryDto, @Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        return this.memoryService.createUserMemory({
            userId: user.id,
            content: body.content,
            category: body.category,
            source: "manual",
        });
    }

    @Patch(":id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateUserMemoryDto,
        @Playground() user?: UserPlayground,
    ) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        const memory = await this.memoryService.updateUserMemory(id, user.id, body);
        if (!memory) throw HttpErrorFactory.notFound("记忆不存在或已删除");
        return memory;
    }

    @Delete("all")
    async clear(@Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        await this.memoryService.deactivateAllUserMemories(user.id);
    }

    @Delete(":id")
    async remove(@Param("id") id: string, @Playground() user?: UserPlayground) {
        if (!user?.id) throw HttpErrorFactory.unauthorized();
        const memory = await this.memoryService.findUserMemoryById(id, user.id);
        if (!memory) throw HttpErrorFactory.notFound("记忆不存在或已删除");
        await this.memoryService.deactivateUserMemory(id, user.id);
    }
}
