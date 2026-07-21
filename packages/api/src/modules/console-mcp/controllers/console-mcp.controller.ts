import { Public } from "@buildingai/decorators";
import { All, Body, Controller, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { ConsoleMcpKeyGuard } from "../guards/console-mcp-key.guard";
import { ConsoleMcpRuntimeService } from "../services/console-mcp-runtime.service";

@Controller("mcp/buildingai-console-mcp")
@Public()
@UseGuards(ConsoleMcpKeyGuard)
export class ConsoleMcpController {
    constructor(private readonly runtime: ConsoleMcpRuntimeService) {}

    @All()
    async handle(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: unknown,
    ): Promise<void> {
        await this.runtime.handleHttp(req, res, body);
    }
}
