import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Post } from "@nestjs/common";

import { CreateConsoleMcpApiKeyDto } from "../../dto/create-console-mcp-api-key.dto";
import { ConsoleMcpApiKeyService } from "../../services/console-mcp-api-key.service";

@ConsoleController(
    { path: "console-mcp-keys", skipPermissionCheck: true },
    "Console MCP API Keys",
)
export class ConsoleMcpApiKeyConsoleController {
    constructor(private readonly keyService: ConsoleMcpApiKeyService) {}

    @Post()
    async create(@Playground() user: UserPlayground, @Body() dto: CreateConsoleMcpApiKeyDto) {
        return this.keyService.create(user.id, dto.label);
    }

    @Get()
    async list(@Playground() user: UserPlayground) {
        return this.keyService.listForUser(user.id);
    }

    @Delete(":id")
    async revoke(@Playground() user: UserPlayground, @Param("id") id: string) {
        await this.keyService.revoke(user.id, id);
        return { success: true };
    }
}
