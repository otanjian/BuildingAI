import type { OpencodeSessionMessage } from "../integrations/opencode-api.service";
import { createSensitiveWordFilter } from "../utils/sensitive-word-filter";
import { OpencodeTokenUsageAccumulator } from "../utils/opencode-token-usage";

export type OpencodeProjectedToolPart = {
    type: "dynamic-tool";
    toolCallId: string;
    toolName: string;
    state: "input-available" | "output-available" | "output-error";
    input: Record<string, unknown>;
    output?: unknown;
    errorText?: string;
};

export type OpencodeTurnProjection = {
    remoteAssistantMessageIds: string[];
    parts: Array<Record<string, unknown>>;
    usage: ReturnType<OpencodeTokenUsageAccumulator["finalize"]>;
    error: { code: string; message: string } | null;
};

export class OpencodeTurnProjectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OpencodeTurnProjectionError";
    }
}

export function buildOpencodeTurnProjection(input: {
    remoteUserMessageId: string;
    messages: OpencodeSessionMessage[];
    sensitiveWordConfig?: Parameters<typeof createSensitiveWordFilter>[0];
}): OpencodeTurnProjection {
    const descendants = input.messages.filter(
        (message) =>
            message.info?.role === "assistant" &&
            message.info.parentID === input.remoteUserMessageId &&
            Boolean(message.info.id),
    );
    if (descendants.length === 0) {
        throw new OpencodeTurnProjectionError(
            "Exact OpenCode assistant descendants are not visible yet",
        );
    }

    const usageAccumulator = new OpencodeTokenUsageAccumulator();
    for (const descendant of descendants) {
        usageAccumulator.observeMessageUpdated(descendant.info);
        for (const part of descendant.parts ?? []) {
            usageAccumulator.observeStepFinishPart(part);
        }
    }

    const failure = descendants.find((message) => message.info?.error)?.info?.error;
    const error = failure
        ? {
              code: "OPENCODE_REMOTE_MESSAGE_ERROR",
              message: remoteErrorMessage(failure),
          }
        : null;
    const terminal = descendants.some(
        (message) => Boolean(message.info?.finish) || Boolean(message.info?.error),
    );
    if (!terminal) {
        throw new OpencodeTurnProjectionError(
            "Exact OpenCode assistant descendants have not reached a terminal outcome",
        );
    }

    const filter = createSensitiveWordFilter(input.sensitiveWordConfig);
    const parts: Array<Record<string, unknown>> = [];
    for (const descendant of descendants) {
        for (const part of descendant.parts ?? []) {
            const projected = projectPart(part, filter, input.sensitiveWordConfig?.applyToReasoning);
            if (projected) parts.push(projected);
        }
    }

    const visible = parts.some((part) => {
        if (part.type === "text" || part.type === "reasoning") {
            return typeof part.text === "string" && part.text.trim().length > 0;
        }
        return part.type === "dynamic-tool";
    });
    if (!visible && !error) {
        throw new OpencodeTurnProjectionError(
            "Exact OpenCode terminal descendants do not contain a non-blank projection",
        );
    }

    return {
        remoteAssistantMessageIds: descendants.map((message) => message.info!.id!),
        parts,
        usage: usageAccumulator.finalize(),
        error,
    };
}

function projectPart(
    part: Record<string, unknown>,
    filter: ReturnType<typeof createSensitiveWordFilter>,
    applyToReasoning = true,
): Record<string, unknown> | null {
    if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        return { type: "text", text: filter.filterText(part.text) };
    }
    if (part.type === "reasoning" && typeof part.text === "string" && part.text.trim()) {
        return {
            type: "reasoning",
            text: applyToReasoning === false ? part.text : filter.filterText(part.text),
            state: "done",
        };
    }
    if (part.type !== "tool") return null;
    const state =
        part.state && typeof part.state === "object"
            ? (part.state as Record<string, unknown>)
            : {};
    const status = String(state.status ?? "pending");
    const input =
        state.input && typeof state.input === "object"
            ? (state.input as Record<string, unknown>)
            : {};
    const tool: OpencodeProjectedToolPart = {
        type: "dynamic-tool",
        toolCallId: String(part.callID ?? part.id ?? "unknown"),
        toolName: String(part.tool ?? "tool"),
        state:
            status === "completed"
                ? "output-available"
                : status === "error"
                  ? "output-error"
                  : "input-available",
        input,
    };
    if (status === "completed") tool.output = truncate(state.output ?? state.title ?? "ok");
    if (status === "error") tool.errorText = truncate(state.error ?? "OpenCode tool error");
    return tool;
}

function remoteErrorMessage(error: unknown): string {
    if (error && typeof error === "object") {
        const record = error as Record<string, unknown>;
        if (typeof record.message === "string" && record.message.trim()) {
            return record.message.trim();
        }
        if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
    }
    return "OpenCode returned an assistant error";
}

function truncate(value: unknown, max = 8_000): string {
    const text = String(value ?? "");
    return text.length <= max ? text : `${text.slice(0, max)}…`;
}
