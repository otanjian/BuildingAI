import { consoleHttpClient } from "./base";

export type AppSettingsDto = {
    agentId: string | null;
};

export type AgentOptionRow = {
    id: string;
    name: string;
    isInvOptDefault?: boolean;
};

export type AgentOptionsDto = {
    items: AgentOptionRow[];
    configuredAgentId: string | null;
    ehcsAgentId: string | null;
};

export type AgentUpdatePreviewDto = {
    agentName: string;
    description: string;
    rolePrompt: string;
    openingStatement: string;
    openingQuestions: string[];
    quickCommands: Array<{ avatar: string; name: string; content: string }>;
    maxSteps: number;
    mcpServers: Array<{
        name: string;
        url: string;
        role: "ehcs" | "erp";
        tools?: Array<{ name: string; description: string }>;
    }>;
    publishEmbedUrl: string | null;
};

export function getSettings() {
    return consoleHttpClient.get<AppSettingsDto>("/settings");
}

export function getAgentOptions() {
    return consoleHttpClient.get<AgentOptionsDto>("/settings/agent-options");
}

export function getAgentUpdatePreview() {
    return consoleHttpClient.get<AgentUpdatePreviewDto>("/settings/agent-update-preview");
}

export function provisionInvOptAgent() {
    return consoleHttpClient.post<{ agentId: string; created: boolean }>("/settings/provision-agent");
}

export function updateSettings(payload: AppSettingsDto) {
    return consoleHttpClient.put<AppSettingsDto>("/settings", payload);
}
