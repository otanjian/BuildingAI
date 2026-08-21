import type { Agent } from "@buildingai/db/entities/ai-agent.entity";
import type { QuickCommandConfig } from "@buildingai/types/ai/agent-config.interface";

import { createSensitiveWordFilter } from "./sensitive-word-filter";
import { projectQuickCommands, projectRichText } from "./sensitive-word-projector";

export interface AgentSquareCardProjection {
    id: string;
    name: string;
    description: string | null;
    avatar: string | null;
    createMode: Agent["createMode"];
    chatAvatar: string | null;
    chatAvatarEnabled: boolean;
    userCount: number;
    updatedAt: Date;
    createBy: string;
    allowCopy: boolean;
    tags: Agent["tags"];
}

export function projectSquareCard(agent: Agent): AgentSquareCardProjection {
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description ?? null,
        avatar: agent.avatar ?? null,
        createMode: agent.createMode,
        chatAvatar: agent.chatAvatar ?? null,
        chatAvatarEnabled: agent.chatAvatarEnabled ?? false,
        userCount: agent.userCount ?? 0,
        updatedAt: agent.updatedAt,
        createBy: agent.createBy,
        allowCopy: agent.publishConfig?.allowCopy === true,
        tags: agent.tags ?? [],
    };
}

export function projectPublishedAgent(agent: Agent): Record<string, unknown> {
    const filter = createSensitiveWordFilter(agent.sensitiveWordConfig, agent.id);
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description ?? null,
        tags: agent.tags ?? [],
        avatar: agent.avatar ?? null,
        chatAvatar: agent.chatAvatar ?? null,
        chatAvatarEnabled: agent.chatAvatarEnabled ?? false,
        createMode: agent.createMode,
        modelConfig: agent.modelConfig?.id ? { id: agent.modelConfig.id } : null,
        showContext: agent.showContext,
        showReference: agent.showReference,
        enableFileUpload: agent.enableFileUpload,
        openingStatement:
            typeof agent.openingStatement === "string"
                ? projectRichText(agent.openingStatement, filter)
                : null,
        openingQuestions: agent.openingQuestions ?? [],
        formFields: agent.formFields ?? [],
        voiceConfig: agent.voiceConfig ?? null,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        allowCopy: agent.publishConfig?.allowCopy === true,
    };
}

export function projectCopyContent(agent: Agent): {
    openingStatement: string | undefined;
    quickCommands: QuickCommandConfig[] | undefined;
} {
    const filter = createSensitiveWordFilter(agent.sensitiveWordConfig, agent.id);
    return {
        openingStatement:
            typeof agent.openingStatement === "string"
                ? projectRichText(agent.openingStatement, filter)
                : undefined,
        quickCommands: projectQuickCommands(agent.quickCommands, filter),
    };
}

export function copyThirdPartyDiscriminator(
    integration: Agent["thirdPartyIntegration"],
): Agent["thirdPartyIntegration"] {
    const provider = integration?.provider;
    return provider === "coze" || provider === "dify" || provider === "opencode"
        ? {
              provider,
              extendedConfig: { reconnectRequired: true },
              useExternalConversation: provider === "opencode",
          }
        : {};
}
