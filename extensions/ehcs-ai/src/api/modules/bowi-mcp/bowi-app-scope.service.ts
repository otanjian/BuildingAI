import { getBowiAppScope, type BowiAppScope } from "@buildingai/constants/shared/bowi-app-scopes";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BowiAppScopeService {
    resolve(appId: unknown): BowiAppScope {
        if (typeof appId !== "string" || !appId.trim()) {
            throw new Error("appId is required on every bowi-mcp tool call");
        }
        const scope = getBowiAppScope(appId.trim());
        if (!scope) {
            throw new Error(`Unknown bowi-mcp appId: ${appId}`);
        }
        return scope;
    }
}
