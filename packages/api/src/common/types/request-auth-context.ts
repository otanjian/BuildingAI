import type { Request } from "express";

export const REQUEST_AUTH_CONTEXT = Symbol.for("buildingai.request-auth-context");

export type RequestAuthSource = "login" | "publish_key" | "site_access_token" | "anonymous";

export interface RequestAuthContext {
    source: RequestAuthSource;
    agentId?: string;
    tenantId?: string;
    projectId?: string;
    membershipId?: string;
    roleCode?: string;
    policyVersion?: number;
}

type RequestWithAuthContext = Request & { [REQUEST_AUTH_CONTEXT]?: RequestAuthContext };

export function setRequestAuthContext(request: Request, context: RequestAuthContext): void {
    const current = (request as RequestWithAuthContext)[REQUEST_AUTH_CONTEXT];
    (request as RequestWithAuthContext)[REQUEST_AUTH_CONTEXT] = { ...current, ...context };
}

export function getRequestAuthContext(request: Request): RequestAuthContext | undefined {
    return (request as RequestWithAuthContext)[REQUEST_AUTH_CONTEXT];
}
