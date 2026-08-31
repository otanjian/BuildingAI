import { randomUUID } from "node:crypto";

export type RequestContext = {
    requestId: string;
    correlationId: string;
    traceId?: string;
    tenantId?: string;
    projectId?: string;
    actorId?: string;
    agentId?: string;
    agentVersionId?: string;
};

export function createRequestContext(input: Partial<RequestContext> = {}): RequestContext {
    return {
        requestId: input.requestId || randomUUID(),
        correlationId: input.correlationId || input.requestId || randomUUID(),
        traceId: input.traceId,
        tenantId: input.tenantId,
        projectId: input.projectId,
        actorId: input.actorId,
        agentId: input.agentId,
        agentVersionId: input.agentVersionId,
    };
}

export function childRequestContext(parent: RequestContext, input: Partial<RequestContext> = {}): RequestContext {
    return createRequestContext({ ...parent, ...input, correlationId: input.correlationId || parent.correlationId });
}
