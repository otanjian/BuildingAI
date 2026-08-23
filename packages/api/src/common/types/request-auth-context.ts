import type { Request } from "express";

export const REQUEST_AUTH_CONTEXT = Symbol.for("buildingai.request-auth-context");

export type RequestAuthSource = "login" | "publish_key" | "site_access_token" | "anonymous";

export interface RequestAuthContext {
    source: RequestAuthSource;
    agentId?: string;
}

type RequestWithAuthContext = Request & { [REQUEST_AUTH_CONTEXT]?: RequestAuthContext };

export function setRequestAuthContext(request: Request, context: RequestAuthContext): void {
    (request as RequestWithAuthContext)[REQUEST_AUTH_CONTEXT] = context;
}

export function getRequestAuthContext(request: Request): RequestAuthContext | undefined {
    return (request as RequestWithAuthContext)[REQUEST_AUTH_CONTEXT];
}
