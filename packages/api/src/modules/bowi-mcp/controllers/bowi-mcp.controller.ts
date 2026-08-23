import { All, Body, Controller, Req, Res, SetMetadata } from "@nestjs/common";
import type { Request, Response } from "express";

import { DECORATOR_KEYS } from "../../../common/constants/decorators-key.constant";
import { BowiMcpRuntimeService, type BowiJsonRpcRequest } from "../services/bowi-mcp-runtime.service";

const webPrefix = (process.env.VITE_APP_WEB_API_PREFIX || "/api").replace(/^\/+|\/+$/g, "");

@Controller(`${webPrefix}/mcp/bowi-mcp`)
@SetMetadata(DECORATOR_KEYS.IS_PUBLIC_KEY, true)
export class BowiMcpController {
    constructor(private readonly runtime: BowiMcpRuntimeService) {}

    @All()
    async handle(
        @Req() request: Request,
        @Res() response: Response,
        @Body() body: BowiJsonRpcRequest,
    ): Promise<void> {
        if (request.method === "GET" || request.method === "DELETE") {
            response.sendStatus(405);
            return;
        }
        const accept = request.headers.accept ?? "";
        if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
            response.status(406).json({
                jsonrpc: "2.0",
                id: body?.id ?? null,
                error: {
                    code: -32000,
                    message: "Client must accept application/json and text/event-stream",
                },
            });
            return;
        }
        const contentType = request.headers["content-type"] ?? "";
        if (!contentType.includes("application/json")) {
            response.status(415).json({
                jsonrpc: "2.0",
                id: body?.id ?? null,
                error: { code: -32000, message: "Content-Type must be application/json" },
            });
            return;
        }
        try {
            const payload = await this.runtime.dispatch(body, request.headers);
            if (body?.id === undefined) {
                response.status(202).end();
                return;
            }
            response.status(200).json(payload);
        } catch (error) {
            response.status(401).json({
                jsonrpc: "2.0",
                id: body?.id ?? null,
                error: {
                    code: -32001,
                    message: error instanceof Error ? error.message : "Unauthorized Bowi MCP client",
                },
            });
        }
    }
}
