/**
 * Detect hung / healable OpenCode session messages (gap-fill helpers).
 */

export type OpencodeSessionMessageLike = {
    info?: {
        id?: string;
        role?: string;
        finish?: string | null;
        error?: unknown;
    };
    parts?: Array<{ type?: string; text?: string; tool?: string; [key: string]: unknown }>;
};

export function isOpencodeSessionStuck(
    messages: OpencodeSessionMessageLike[] | null | undefined,
): boolean {
    if (!messages?.length) return false;
    const last = messages[messages.length - 1];
    const role = last?.info?.role;
    if (role !== "assistant") return false;
    const finish = last.info?.finish;
    return finish == null || finish === "";
}

export function isPlaceholderAssistantText(text: string | null | undefined): boolean {
    if (!text) return false;
    const normalized = text.toLowerCase();
    return (
        normalized.includes("error: aborted") ||
        normalized.includes("turn timed out") ||
        normalized.includes("opencode turn timed out") ||
        normalized.includes("messageabortederror")
    );
}

export function extractOpencodeMessageText(message: OpencodeSessionMessageLike): string {
    const parts = message.parts ?? [];
    return parts
        .filter((p) => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("\n")
        .trim();
}

export function findHealableCompletedAssistant(
    messages: OpencodeSessionMessageLike[] | null | undefined,
    alreadyHealedMessageId?: string | null,
): { info: { id: string; role: string }; text: string; message: OpencodeSessionMessageLike } | undefined {
    if (!messages?.length) return undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        const role = m?.info?.role;
        const id = m?.info?.id;
        if (role !== "assistant" || !id) continue;
        if (alreadyHealedMessageId && id === alreadyHealedMessageId) return undefined;
        const finish = m.info?.finish;
        if (finish == null || finish === "") continue;
        if (m.info?.error) continue;
        const text = extractOpencodeMessageText(m);
        if (!text || isPlaceholderAssistantText(text)) continue;
        return { info: { id, role: "assistant" }, text, message: m };
    }
    return undefined;
}
