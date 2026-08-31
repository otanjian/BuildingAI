export type WecomAibotConnectionState = "stopped" | "connecting" | "connected" | "error";

export interface WecomAibotChannelConfig {
    connectionId: string;
    name: string;
    agentId: string;
    agentAccessToken: string;
    botId: string;
    botSecret: string;
    enabled: boolean;
}

export interface WecomAibotConnectionStatus {
    connectionId: string;
    name: string;
    agentId: string;
    agentName?: string;
    botId: string;
    enabled: boolean;
    connectionState: WecomAibotConnectionState;
    lastError?: string;
    updatedAt?: string;
    hasBotSecret: boolean;
    hasAgentAccessToken: boolean;
}

export interface WecomAibotMessageBody {
    msgid?: string;
    aibotid?: string;
    chatid?: string;
    chattype?: "single" | "group" | string;
    from?: { userid?: string };
    msgtype?: string;
    text?: { content?: string };
}

export interface WecomAibotMessageFrame {
    cmd?: string;
    headers?: { req_id?: string };
    body?: WecomAibotMessageBody;
}
