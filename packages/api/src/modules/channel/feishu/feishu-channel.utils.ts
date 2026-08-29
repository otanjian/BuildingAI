import type { FeishuChannelConfig } from "./feishu-channel.types";

export interface AgentStreamEvent {
    type?: string;
    delta?: string;
    data?: string;
    [key: string]: unknown;
}

export function validateFeishuConfig(
    config: Partial<FeishuChannelConfig>,
    options: { requireAgentAccessToken?: boolean } = {},
): asserts config is FeishuChannelConfig {
    if (!config.agentId?.trim()) throw new Error("Agent ID is required");
    if (!config.appId?.trim()) throw new Error("Feishu app ID is required");
    if (!config.appSecret?.trim()) throw new Error("Feishu app secret is required");
    if (options.requireAgentAccessToken !== false && !config.agentAccessToken?.trim()) {
        throw new Error("Agent access token is required");
    }
}

export function normalizeFeishuAppId(appId: string): string {
    return appId.trim();
}

export function normalizeFeishuConnectionName(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function maskSecret(secret: string | undefined | null): string {
    if (!secret || secret.length <= 8) return "••••";
    return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

export function extractFeishuText(content: string | undefined, botMentionKey?: string): string {
    if (!content) return "";
    try {
        const parsed = JSON.parse(content) as { text?: unknown };
        if (typeof parsed.text !== "string") return "";
        const text = parsed.text
            .replace(/<at[^>]*>.*?<\/at>/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        if (!botMentionKey) return text;
        return text.replaceAll(botMentionKey, "").replace(/^\s+/, "").trim();
    } catch {
        return "";
    }
}

export function buildFeishuAnonymousIdentifier(agentId: string, chatId: string): string {
    return `feishu:${agentId}:${chatId}`;
}

/** Parse one UI-message SSE data line from the published agent endpoint. */
export function parseAgentStreamEvent(line: string): AgentStreamEvent | undefined {
    const match = line.match(/^data:\s*(.+)$/);
    if (!match || match[1] === "[DONE]") return undefined;
    try {
        const parsed = JSON.parse(match[1]) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
        return parsed as AgentStreamEvent;
    } catch {
        return undefined;
    }
}

/** Build a Feishu CardKit card configured for native typewriter updates. */
export function buildFeishuStreamingCard(initialText = "Thinking..."): Record<string, unknown> {
    return {
        schema: "2.0",
        config: {
            streaming_mode: true,
            summary: { content: "[Generating...]" },
            streaming_config: {
                print_frequency_ms: { default: 70 },
                print_step: { default: 1 },
                print_strategy: "fast",
            },
        },
        body: {
            elements: [
                {
                    tag: "markdown",
                    element_id: "stream_md",
                    content: initialText,
                },
            ],
        },
    };
}

/** Accept either the raw published-agent token or the complete public agent URL. */
export function normalizeAgentAccessToken(value: string, agentId: string): string {
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) return trimmed;
    try {
        const segments = new URL(trimmed).pathname.split("/").filter(Boolean);
        const agentIndex = segments.indexOf(agentId);
        const token = agentIndex >= 0 ? segments[agentIndex + 1] : undefined;
        if (token) return token;
    } catch {
        // Validation below reports the missing token in a user-safe way.
    }
    return "";
}

export function parseStoredFeishuConfig(
    value: string,
    agentId: string,
    options: { requireAgentAccessToken?: boolean } = {},
): FeishuChannelConfig {
    let parsed: Partial<FeishuChannelConfig>;
    try {
        parsed = JSON.parse(value) as Partial<FeishuChannelConfig>;
    } catch {
        throw new Error(`Invalid Feishu configuration for agent ${agentId}`);
    }
    const config = { ...parsed, agentId };
    validateFeishuConfig(config, { requireAgentAccessToken: false, ...options });
    return {
        agentId,
        appId: config.appId.trim(),
        appSecret: config.appSecret.trim(),
        agentAccessToken: config.agentAccessToken?.trim() || "",
        enabled: config.enabled === true,
        onlyMentioned: config.onlyMentioned !== false,
    };
}
