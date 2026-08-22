import type { OpencodeTurnStatus } from "@buildingai/db/entities";
import type { OpencodePendingQuestion } from "../integrations/opencode-api.service";

export type OpencodeLiveProjectionInput = {
    status: Extract<OpencodeTurnStatus, "accepted" | "running" | "committing">;
    parts: Array<Record<string, unknown>>;
    remoteAssistantMessageIds: string[];
    pendingQuestion?: OpencodePendingQuestion | null;
};

export type OpencodeLiveProjection = OpencodeLiveProjectionInput & {
    truncated: boolean;
};

export type OpencodeLiveProjectionLimits = {
    maxParts: number;
    maxTextChars: number;
    maxToolOutputChars: number;
    maxInputChars: number;
};

const DEFAULT_LIMITS: OpencodeLiveProjectionLimits = {
    maxParts: 100,
    maxTextChars: 24_000,
    maxToolOutputChars: 8_000,
    maxInputChars: 4_000,
};

export function sanitizeOpencodeLiveProjection(
    input: OpencodeLiveProjectionInput,
    limits: Partial<OpencodeLiveProjectionLimits> = {},
): OpencodeLiveProjection {
    const resolved = { ...DEFAULT_LIMITS, ...limits };
    let truncated = input.parts.length > resolved.maxParts;
    const parts = input.parts.slice(-resolved.maxParts).map((part) => {
        const next = { ...part };
        if ((next.type === "text" || next.type === "reasoning") && typeof next.text === "string") {
            const result = truncate(next.text, resolved.maxTextChars);
            next.text = result.value;
            truncated ||= result.truncated;
        }
        if (next.type === "dynamic-tool") {
            if (Object.prototype.hasOwnProperty.call(next, "output")) {
                const result = truncate(stringify(next.output), resolved.maxToolOutputChars);
                next.output = result.value;
                next.truncated = result.truncated || next.truncated === true;
                truncated ||= result.truncated;
            }
            if (typeof next.errorText === "string") {
                const result = truncate(next.errorText, resolved.maxToolOutputChars);
                next.errorText = result.value;
                next.truncated = result.truncated || next.truncated === true;
                truncated ||= result.truncated;
            }
            if (next.input && typeof next.input === "object") {
                const inputResult = truncate(stringify(next.input), resolved.maxInputChars);
                if (inputResult.truncated) {
                    next.input = { preview: inputResult.value, truncated: true };
                    next.truncated = true;
                    truncated = true;
                }
            }
        }
        return next;
    });

    return {
        status: input.status,
        parts,
        remoteAssistantMessageIds: [...new Set(input.remoteAssistantMessageIds)].slice(-50),
        ...(input.pendingQuestion === undefined
            ? {}
            : { pendingQuestion: sanitizePendingQuestion(input.pendingQuestion) }),
        truncated,
    };
}

function sanitizePendingQuestion(
    value: OpencodePendingQuestion | null,
): OpencodePendingQuestion | null {
    if (!value) return null;
    return {
        requestId: value.requestId.slice(0, 200),
        sessionId: value.sessionId.slice(0, 200),
        questions: value.questions.slice(0, 20).map((question) => ({
            question: question.question.slice(0, 4_000),
            header: question.header.slice(0, 200),
            options: question.options.slice(0, 50).map((option) => ({
                label: option.label.slice(0, 500),
                description: option.description.slice(0, 2_000),
            })),
            multiple: question.multiple === true,
            custom: question.custom !== false,
        })),
    };
}

function stringify(value: unknown): string {
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value ?? "");
    }
}

function truncate(value: string, max: number): { value: string; truncated: boolean } {
    if (value.length <= max) return { value, truncated: false };
    const marker = "… [truncated]";
    return {
        value: `${value.slice(0, Math.max(0, max - marker.length))}${marker}`,
        truncated: true,
    };
}
