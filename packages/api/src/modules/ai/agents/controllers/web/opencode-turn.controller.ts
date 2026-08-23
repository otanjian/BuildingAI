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
    Res,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { getRequestAuthContext } from "../../../../../common/types/request-auth-context";
import { OpencodeTurnRequestDto } from "../../dto/web/chat/opencode-turn.dto";
import {
    OpencodeQuestionRejectDto,
    OpencodeQuestionReplyDto,
} from "../../dto/web/chat/opencode-question.dto";
import { OpencodeTurnAcceptanceService } from "../../services/opencode-turn-acceptance.service";
import { OpencodeTurnEventsService } from "../../services/opencode-turn-events.service";

@WebController("ai-agents")
export class OpencodeTurnWebController {
    constructor(
        private readonly acceptanceService: OpencodeTurnAcceptanceService,
        private readonly eventsService: OpencodeTurnEventsService,
    ) {}

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
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        return this.acceptanceService.accept({
            agentId,
            userId: playground.id,
            anonymousIdentifier,
            authSource: anonymousIdentifier
                ? "anonymous"
                : (getRequestAuthContext(req)?.source ?? "anonymous"),
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

    @Post(":id/chat/opencode-turns/:turnId/stop")
    @AgentPublicAccess({
        route: "opencode-turns/:turnId/stop",
        targetPath: ":id/chat/opencode-turns/:turnId/stop",
        method: "POST",
    })
    async stopTurn(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Param("turnId", new ParseUUIDPipe({ version: "4" })) turnId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        return this.acceptanceService.requestCancel({
            agentId,
            turnId,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
        });
    }

    @Post(":id/chat/opencode-turns/:turnId/question/reply")
    @AgentPublicAccess({
        route: "opencode-turns/:turnId/question/reply",
        targetPath: ":id/chat/opencode-turns/:turnId/question/reply",
        method: "POST",
    })
    async replyQuestion(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Param("turnId", new ParseUUIDPipe({ version: "4" })) turnId: string,
        @Body() dto: OpencodeQuestionReplyDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        return this.acceptanceService.replyQuestion({
            agentId,
            turnId,
            requestId: dto.requestId,
            answers: dto.answers,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
        });
    }

    @Post(":id/chat/opencode-turns/:turnId/question/reject")
    @AgentPublicAccess({
        route: "opencode-turns/:turnId/question/reject",
        targetPath: ":id/chat/opencode-turns/:turnId/question/reject",
        method: "POST",
    })
    async rejectQuestion(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Param("turnId", new ParseUUIDPipe({ version: "4" })) turnId: string,
        @Body() dto: OpencodeQuestionRejectDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        return this.acceptanceService.rejectQuestion({
            agentId,
            turnId,
            requestId: dto.requestId,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
        });
    }

    @Get(":id/chat/opencode-turns/:turnId/events")
    @AgentPublicAccess({
        route: "opencode-turns/:turnId/events",
        targetPath: ":id/chat/opencode-turns/:turnId/events",
        method: "GET",
    })
    async streamTurnEvents(
        @Param("id", new ParseUUIDPipe({ version: "4" })) agentId: string,
        @Param("turnId", new ParseUUIDPipe({ version: "4" })) turnId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        let cursor = this.header(req, "last-event-id");
        const owner = {
            agentId,
            turnId,
            userId: playground.id,
            anonymousIdentifier: this.extractAnonymousIdentifier(req),
        };
        // Authorize before opening the SSE response.
        const initial = await this.eventsService.read({ ...owner, lastEventId: cursor });
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        let closed = false;
        let reading = false;
        let binding = false;
        let unwatchRuntime: (() => void) | null = null;
        const write = (event: Awaited<ReturnType<OpencodeTurnEventsService["read"]>>) => {
            if (!event || closed || res.writableEnded) return;
            cursor = event.id;
            res.write(
                `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
            );
            if (event.type === "terminal") close();
        };
        const close = () => {
            if (closed) return;
            closed = true;
            clearInterval(pollTimer);
            clearInterval(heartbeatTimer);
            unwatchRuntime?.();
            if (!res.writableEnded) res.end();
        };
        const poll = async () => {
            if (closed || reading) return;
            reading = true;
            try {
                write(await this.eventsService.read({ ...owner, lastEventId: cursor }));
                if (!unwatchRuntime && !binding && !closed) {
                    binding = true;
                    try {
                        unwatchRuntime = await this.eventsService.subscribe({
                            ...owner,
                            onInvalidate: poll,
                        });
                    } finally {
                        binding = false;
                    }
                }
            } finally {
                reading = false;
            }
        };
        const pollTimer = setInterval(() => void poll(), 750);
        const heartbeatTimer = setInterval(() => {
            if (!closed && !res.writableEnded) res.write(": heartbeat\n\n");
        }, 15_000);
        unwatchRuntime = await this.eventsService.subscribe({
            ...owner,
            onInvalidate: poll,
        });
        pollTimer.unref?.();
        heartbeatTimer.unref?.();
        req.on("close", close);
        req.on("aborted", close);
        res.on("close", close);
        write(initial);
    }

    private extractAnonymousIdentifier(req: Request): string | undefined {
        const value = req.headers["x-anonymous-identifier"];
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private header(req: Request, name: string): string | undefined {
        const value = req.headers[name];
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }
}
