import type { QuickCommandConfig } from "@buildingai/types/ai/agent-config.interface";

import type { SensitiveWordFilter } from "./sensitive-word-filter";

type ProjectablePart = Record<string, any>;

function projectTextLeaves(value: unknown, filter: SensitiveWordFilter): unknown {
    if (Array.isArray(value)) return value.map((item) => projectTextLeaves(item, filter));
    if (!value || typeof value !== "object") return value;

    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        result[key] =
            key === "text" && typeof child === "string"
                ? filter.filterText(child)
                : Array.isArray(child) || (child !== null && typeof child === "object")
                  ? projectTextLeaves(child, filter)
                  : child;
    }
    return result;
}

export function projectRichText(value: string, filter: SensitiveWordFilter): string {
    if (!filter.enabled || !value) return value;
    try {
        const parsed = JSON.parse(value);
        if (parsed === null || typeof parsed !== "object") return filter.filterText(value);
        return JSON.stringify(projectTextLeaves(parsed, filter));
    } catch {
        return filter.filterText(value);
    }
}

export function projectAssistantParts<T extends ProjectablePart>(
    parts: T[],
    filter: SensitiveWordFilter,
    applyToReasoning: boolean,
): T[] {
    if (!filter.enabled) return parts;
    return parts.map((part) => {
        if (part.type === "text" && typeof part.text === "string") {
            return { ...part, text: filter.filterText(part.text) };
        }
        if (
            part.type === "reasoning" &&
            applyToReasoning &&
            typeof part.text === "string"
        ) {
            return { ...part, text: filter.filterText(part.text) };
        }
        if (
            part.type === "data-follow-up-suggestions" &&
            Array.isArray(part.data) &&
            part.data.every((value: unknown) => typeof value === "string")
        ) {
            return { ...part, data: part.data.map((value: string) => filter.filterText(value)) };
        }
        if (
            (part.type === "data-custom-reply" || part.type === "data-annotation-reply") &&
            part.data &&
            typeof part.data === "object" &&
            typeof part.data.text === "string"
        ) {
            return { ...part, data: { ...part.data, text: filter.filterText(part.data.text) } };
        }
        return part;
    });
}

export function projectQuickCommands(
    commands: QuickCommandConfig[] | null | undefined,
    filter: SensitiveWordFilter,
): QuickCommandConfig[] | undefined {
    if (!commands) return undefined;
    return commands.map((command) =>
        command.replyType === "custom" && typeof command.replyContent === "string"
            ? { ...command, replyContent: projectRichText(command.replyContent, filter) }
            : { ...command },
    );
}
