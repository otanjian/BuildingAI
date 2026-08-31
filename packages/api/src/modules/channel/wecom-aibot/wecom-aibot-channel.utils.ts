import type { WecomAibotMessageBody } from "./wecom-aibot-channel.types";

export interface WecomAibotRequiredConfig {
    agentId?: string;
    botId?: string;
    botSecret?: string;
    agentAccessToken?: string;
}

export function validateWecomConfig(
    config: WecomAibotRequiredConfig,
): asserts config is Required<WecomAibotRequiredConfig> {
    if (!config.agentId?.trim()) throw new Error("Agent ID is required");
    if (!config.botId?.trim()) throw new Error("WeCom BotID is required");
    if (!config.botSecret?.trim()) throw new Error("WeCom Bot Secret is required");
    if (!config.agentAccessToken?.trim()) throw new Error("Agent access token is required");
}

export function normalizeWecomBotId(botId: string): string {
    return botId.trim().toLocaleLowerCase();
}

export function normalizeWecomConnectionName(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function extractWecomText(body: WecomAibotMessageBody): string {
    const content = body.text?.content?.replace(/\s+/g, " ").trim() || "";
    if (!content || body.chattype !== "group") return content;
    return content.replace(/^@\S+\s*/, "").trim();
}

export function resolveWecomConversationScope(body: WecomAibotMessageBody): string | undefined {
    if (body.chattype === "group" && body.chatid?.trim()) return `group:${body.chatid.trim()}`;
    if (body.chattype === "single" && body.from?.userid?.trim()) {
        return `single:${body.from.userid.trim()}`;
    }
    return undefined;
}

export function buildWecomAnonymousIdentifier(connectionId: string, scope: string): string {
    return `wecom:${connectionId}:${scope}`;
}

export function maskWecomSecret(secret: string | undefined | null): string {
    if (!secret || secret.length <= 8) return "••••";
    return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

export function truncateWecomStreamContent(content: string, maxBytes = 20_000): string {
    if (Buffer.byteLength(content, "utf8") <= maxBytes) return content;
    const suffix = "…";
    const suffixBytes = Buffer.byteLength(suffix, "utf8");
    let result = "";
    let bytes = 0;
    for (const character of content) {
        const nextBytes = Buffer.byteLength(character, "utf8");
        if (bytes + nextBytes + suffixBytes > maxBytes) break;
        result += character;
        bytes += nextBytes;
    }
    return `${result}${suffix}`;
}
