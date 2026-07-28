import type { ContextConfig } from "@buildingai/types/ai/agent-config.interface";
import type { LanguageModel, UIMessage } from "ai";
import { generateId, generateText } from "ai";

const DEFAULT_MAX_CONTEXT_MESSAGES = 16;

export type ContextCompressResult = {
    messages: UIMessage[];
    compressed: boolean;
    strategy: "none" | "sliding_window" | "summary";
    reason?: string;
};

export type SummarizeFn = (prompt: string) => Promise<string>;

function extractText(message: UIMessage): string {
    const parts = (message as UIMessage & { parts?: Array<{ type?: string; text?: string }> })
        .parts;
    if (!Array.isArray(parts)) return "";
    return parts
        .map((p) => (p?.type === "text" ? (p.text ?? "") : p?.type ? `[${p.type}]` : ""))
        .filter(Boolean)
        .join("\n");
}

/** Rough token estimate (~4 chars/token) for soft limits. */
export function estimateTokens(messages: UIMessage[]): number {
    let chars = 0;
    for (const m of messages) {
        chars += extractText(m).length + (m.role?.length ?? 0) + 8;
    }
    return Math.ceil(chars / 4);
}

export function needsCompression(
    messages: UIMessage[],
    config?: ContextConfig | null,
): { needed: boolean; maxMessages: number; maxTokens?: number } {
    if (!config) return { needed: false, maxMessages: DEFAULT_MAX_CONTEXT_MESSAGES };

    const maxMessages =
        typeof config.maxContextMessages === "number" && config.maxContextMessages > 0
            ? config.maxContextMessages
            : config.truncationStrategy === "summary"
              ? DEFAULT_MAX_CONTEXT_MESSAGES
              : 0;

    const maxTokens =
        typeof config.maxContextTokens === "number" && config.maxContextTokens > 0
            ? config.maxContextTokens
            : undefined;

    if (!maxMessages && !maxTokens) return { needed: false, maxMessages: 0 };

    const overMessages = maxMessages > 0 && messages.length > maxMessages;
    const overTokens = maxTokens != null && estimateTokens(messages) > maxTokens;
    return { needed: overMessages || overTokens, maxMessages: maxMessages || DEFAULT_MAX_CONTEXT_MESSAGES, maxTokens };
}

export function splitForCompression(
    messages: UIMessage[],
    maxMessages: number,
): { older: UIMessage[]; recent: UIMessage[] } {
    const keepRecent = Math.max(4, Math.floor(maxMessages / 2));
    if (messages.length <= keepRecent) {
        return { older: [], recent: [...messages] };
    }

    let splitAt = messages.length - keepRecent;
    const recentSlice = messages.slice(splitAt);
    if (!recentSlice.some((m) => m.role === "user")) {
        const lastUser = messages.findLastIndex((m) => m.role === "user");
        if (lastUser >= 0 && lastUser < splitAt) {
            splitAt = lastUser;
        }
    }

    return {
        older: messages.slice(0, splitAt),
        recent: messages.slice(splitAt),
    };
}

export function applySlidingWindow(messages: UIMessage[], maxMessages: number): UIMessage[] {
    if (!maxMessages || messages.length <= maxMessages) return messages;

    const lastUser = messages.findLastIndex((m) => m.role === "user");
    if (lastUser < 0) return messages.slice(-maxMessages);

    const keep = messages.slice(Math.max(0, messages.length - maxMessages));
    if (!keep.some((m) => m.role === "user")) {
        return [...messages.slice(lastUser, lastUser + 1), ...keep].slice(-maxMessages);
    }
    return keep;
}

export function buildSummaryMessage(summary: string): UIMessage {
    const text = summary.trim() || "(empty summary)";
    return {
        id: generateId(),
        role: "user",
        parts: [
            {
                type: "text",
                text:
                    "[Prior conversation summary — compressed automatically to fit context]\n" +
                    text,
            },
        ],
    } as UIMessage;
}

export function formatMessagesForSummary(messages: UIMessage[]): string {
    return messages
        .map((m, i) => {
            const body = extractText(m).slice(0, 4000);
            return `#${i + 1} [${m.role}]\n${body || "(no text)"}`;
        })
        .join("\n\n")
        .slice(0, 60_000);
}

export function createGenerateTextSummarizer(model: LanguageModel): SummarizeFn {
    return async (prompt: string) => {
        const result = await generateText({
            model,
            prompt,
            maxOutputTokens: 1200,
        });
        return result.text?.trim() || "";
    };
}

export async function compressAgentContext(
    messages: UIMessage[],
    config: ContextConfig | null | undefined,
    summarize?: SummarizeFn,
): Promise<ContextCompressResult> {
    const check = needsCompression(messages, config);
    if (!check.needed) {
        return { messages, compressed: false, strategy: "none" };
    }

    const strategy = config?.truncationStrategy ?? "sliding_window";
    const { maxMessages } = check;

    if (strategy !== "summary" || !summarize) {
        return {
            messages: applySlidingWindow(messages, maxMessages),
            compressed: true,
            strategy: "sliding_window",
            reason: strategy === "summary" && !summarize ? "summary_fn_missing" : undefined,
        };
    }

    const { older, recent } = splitForCompression(messages, maxMessages);
    if (!older.length) {
        return {
            messages: applySlidingWindow(messages, maxMessages),
            compressed: true,
            strategy: "sliding_window",
            reason: "nothing_to_summarize",
        };
    }

    try {
        const prompt =
            "Summarize the following earlier chat turns for an AI assistant continuing the conversation.\n" +
            "Keep: user goals, key facts, SAP/object identifiers, decisions, and open questions.\n" +
            "Omit: raw tool dumps, repeated errors, secrets/passwords.\n" +
            "Write a concise bullet summary in the same language as the user (default Chinese if mixed).\n\n" +
            formatMessagesForSummary(older);

        const summary = await summarize(prompt);
        if (!summary) {
            return {
                messages: applySlidingWindow(messages, maxMessages),
                compressed: true,
                strategy: "sliding_window",
                reason: "empty_summary",
            };
        }

        return {
            messages: [buildSummaryMessage(summary), ...recent],
            compressed: true,
            strategy: "summary",
        };
    } catch (err) {
        return {
            messages: applySlidingWindow(messages, maxMessages),
            compressed: true,
            strategy: "sliding_window",
            reason: err instanceof Error ? err.message : "summary_failed",
        };
    }
}
