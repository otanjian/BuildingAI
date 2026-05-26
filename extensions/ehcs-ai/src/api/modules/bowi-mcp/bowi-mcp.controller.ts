import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { All, Body, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { BowiMcpRuntimeService } from "./bowi-mcp-runtime.service";

@ExtensionConsoleController({ path: "bowi-mcp", skipAuth: true }, "Bowi MCP")
export class BowiMcpController extends BaseController {
    constructor(private readonly runtime: BowiMcpRuntimeService) {
        super();
    }

    @All("mcp")
    async handleMcp(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: unknown,
    ): Promise<void> {
        await this.runtime.handleHttp(req, res, body);
    }
}
