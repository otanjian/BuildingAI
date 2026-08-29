export type FeishuConnectionState = "stopped" | "connecting" | "connected" | "error";

export interface FeishuChannelConfig {
    connectionId?: string;
    name?: string;
    agentId: string;
    agentAccessToken: string;
    appId: string;
    appSecret: string;
    enabled: boolean;
    onlyMentioned: boolean;
    migrationStatus?: "active" | "legacy" | "conflict" | "orphaned" | "deleting";
    migrationError?: string | null;
    legacySourceKey?: string | null;
}

export interface FeishuChannelStatus {
    connectionId?: string;
    name?: string;
    agentId: string;
    agentName?: string;
    appId: string;
    enabled: boolean;
    onlyMentioned: boolean;
    connectionState: FeishuConnectionState;
    lastError?: string;
    updatedAt?: string;
    migrationStatus?: "active" | "legacy" | "conflict" | "orphaned" | "deleting";
    hasAppSecret?: boolean;
    hasAgentAccessToken?: boolean;
    migrationError?: string | null;
}

export interface FeishuChannelEvent {
    event_id?: string;
    sender?: {
        sender_type?: string;
        sender_id?: {
            open_id?: string;
            user_id?: string;
        };
    };
    message?: {
        message_id: string;
        chat_id: string;
        chat_type?: string;
        message_type: string;
        content: string;
        mentions?: Array<{ key?: string; mentioned_type?: string }>;
    };
}

export interface FeishuResolvedIdentity {
    localUserId: string;
    displayName: string;
}
