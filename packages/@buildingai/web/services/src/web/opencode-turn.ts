import { apiHttpClient } from "../base";

export type OpencodeTurnStatus =
    | "accepted"
    | "running"
    | "committing"
    | "completed"
    | "cancelled"
    | "failed";

export type OpencodeTurnMessagePart =
    | { type: "text"; text: string }
    | { type: "file"; mediaType: string; url: string; filename?: string };

export type AcceptOpencodeTurnInput = {
    turnId: string;
    conversationId: string;
    message: {
        role: "user";
        parts: OpencodeTurnMessagePart[];
    };
    formVariables?: Record<string, string>;
    formFieldsInputs?: Record<string, unknown>;
    isDebug?: boolean;
};

export type AcceptedOpencodeTurn = {
    conversationId: string;
    turnId: string;
    status: OpencodeTurnStatus;
    duplicate: boolean;
};

export type OpencodeTurnStatusResult = {
    conversationId: string;
    turnId: string;
    status: OpencodeTurnStatus;
    cancelRequested: boolean;
    assistantMessageId: string | null;
    error: { code: string | null; message: string | null } | null;
    createdAt: string;
    updatedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    lastActivityAt: string | null;
};

export type OpencodeTurnRequestOptions = {
    anonymousIdentifier?: string;
    signal?: AbortSignal;
};

function requestConfig(options?: OpencodeTurnRequestOptions) {
    const anonymousIdentifier = options?.anonymousIdentifier?.trim();
    return {
        signal: options?.signal,
        headers: anonymousIdentifier
            ? { "X-Anonymous-Identifier": anonymousIdentifier }
            : undefined,
    };
}

export function acceptOpencodeTurn(
    agentId: string,
    input: AcceptOpencodeTurnInput,
    options?: OpencodeTurnRequestOptions,
): Promise<AcceptedOpencodeTurn> {
    return apiHttpClient.post<AcceptedOpencodeTurn>(
        `/ai-agents/${agentId}/chat/opencode-turns`,
        input,
        requestConfig(options),
    );
}

export function getOpencodeTurnStatus(
    agentId: string,
    turnId: string,
    options?: OpencodeTurnRequestOptions,
): Promise<OpencodeTurnStatusResult> {
    return apiHttpClient.get<OpencodeTurnStatusResult>(
        `/ai-agents/${agentId}/chat/opencode-turns/${turnId}`,
        requestConfig(options),
    );
}

export function stopOpencodeTurn(
    agentId: string,
    turnId: string,
    options?: OpencodeTurnRequestOptions,
): Promise<OpencodeTurnStatusResult> {
    return apiHttpClient.post<OpencodeTurnStatusResult>(
        `/ai-agents/${agentId}/chat/opencode-turns/${turnId}/stop`,
        undefined,
        requestConfig(options),
    );
}
