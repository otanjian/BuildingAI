import { HttpErrorFactory } from "@buildingai/errors";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { ConsoleMcpApiKeyService } from "../services/console-mcp-api-key.service";

@Injectable()
export class ConsoleMcpKeyGuard implements CanActivate {
    constructor(private readonly keyService: ConsoleMcpApiKeyService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractBearer(request);
        if (!token) {
            throw HttpErrorFactory.unauthorized("Missing Console MCP API key");
        }

        const user = await this.keyService.authenticate(token);
        (request as Request & { user: typeof user }).user = user;
        return true;
    }

    private extractBearer(request: Request): string | undefined {
        const auth = request.headers.authorization;
        if (!auth || typeof auth !== "string") {
            return undefined;
        }
        const [scheme, value] = auth.split(" ");
        if (scheme?.toLowerCase() !== "bearer" || !value) {
            return undefined;
        }
        return value.trim();
    }
}
