import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { AgentPublicAccess } from "@common/decorators/agent-public-access.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import {
    Body,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
} from "@nestjs/common";
import type { Request } from "express";

import { OpencodeTurnRequestDto } from "../../dto/web/chat/opencode-turn.dto";
import { OpencodeTurnAcceptanceService } from "../../services/opencode-turn-acceptance.service";

@WebController("ai-agents")
export class OpencodeTurnWebController {
    constructor(private readonly acceptanceService: OpencodeTurnAcceptanceService) {}

    @Post(":id/chat/opencode-turns")
    @HttpCode(HttpStatus.ACCEPTED)
    @AgentPublicAccess({
        route: "opencode-turns",
        targetPath: ":id/chat/opencode-turns",
        method: "POST",
    })
    async acceptTurn(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Body() dto: OpencodeTurnRequestDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        return this.acceptanceService.accept({
            agentId,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
            ...dto,
        });
    }

    @Get(":id/chat/opencode-turns/:turnId")
    @AgentPublicAccess({
        route: "opencode-turns/:turnId",
        targetPath: ":id/chat/opencode-turns/:turnId",
        method: "GET",
    })
    async getTurnStatus(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Param("turnId", new ParseUUIDPipe({ version: "4" })) turnId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        return this.acceptanceService.getStatus({
            agentId,
            turnId,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
        });
    }

    private extractAnonymousIdentifier(req: Request): string | undefined {
        const value = req.headers["x-anonymous-identifier"];
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }
}
