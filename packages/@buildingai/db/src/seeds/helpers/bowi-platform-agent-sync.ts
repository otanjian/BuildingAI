import { randomBytes } from "node:crypto";

import {
    BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
    buildBowiPlatformModelConfig,
    buildBowiPlatformModelRouting,
} from "@buildingai/constants/shared/bowi-platform-agent-profile";
import { Repository } from "typeorm";

import { BOWI_MCP_SERVER_NAME } from "@buildingai/constants/shared/bowi-mcp.constant";

import { Agent } from "../../entities/ai-agent.entity";
import { AiMcpServer } from "../../entities/ai-mcp-server.entity";
import { AiModel } from "../../entities/ai-model.entity";
import { SquarePublishStatus } from "../../entities/datasets.entity";

const DEFAULT_ERP_MCP_NAME_HINTS = ["erpnext", "erp-next", "erp", "sap"];

function isBowiMcpServer(name: string, alias?: string | null): boolean {
    const lower = (s: string) => s.toLowerCase();
    return (
        lower(name) === BOWI_MCP_SERVER_NAME ||
        lower(name).includes("bowi-mcp") ||
        lower(name).includes("bowiai-mcp")
    );
}

/** Resolve bowi-mcp + ERP MCP ids (bowi first, then ERP). */
export async function resolvePlatformAgentMcpServerIds(
    mcpRepo: Repository<AiMcpServer>,
    erpNameHints: string[] = DEFAULT_ERP_MCP_NAME_HINTS,
): Promise<string[]> {
    const servers = await mcpRepo.find({
        where: { isDisabled: false },
        order: { createdAt: "ASC" },
    });
    const bowi = servers.find(
        (s) => s.name === BOWI_MCP_SERVER_NAME || isBowiMcpServer(s.name, s.alias),
    );
    const erpCandidates = servers.filter((s) => !isBowiMcpServer(s.name, s.alias));
    const lower = (s: string) => s.toLowerCase();
    let erp: AiMcpServer | undefined;
    for (const hint of erpNameHints) {
        erp = erpCandidates.find(
            (s) =>
                lower(s.name).includes(hint) ||
                (s.alias != null && lower(s.alias).includes(hint)),
        );
        if (erp) break;
    }
    if (!erp && erpCandidates.length > 0) {
        erp = erpCandidates[0];
    }
    const ids = [bowi?.id, erp?.id].filter((id): id is string => Boolean(id));
    if (!bowi?.id) {
        throw new Error(
            `MCP server "${BOWI_MCP_SERVER_NAME}" not found. Open EHCS settings and run「更新智能体」once to register bowi-mcp.`,
        );
    }
    return ids;
}

/** Persist bowi-mcp + ERP bindings on a platform agent. */
export async function bindBowiAndErpMcpToAgent(
    agentRepo: Repository<Agent>,
    mcpRepo: Repository<AiMcpServer>,
    agent: Agent,
    erpNameHints: string[] = DEFAULT_ERP_MCP_NAME_HINTS,
): Promise<string[]> {
    const ids = await resolvePlatformAgentMcpServerIds(mcpRepo, erpNameHints);
    agent.mcpServerIds = ids;
    await agentRepo.save(agent);
    return ids;
}

export async function resolveBowiLlmModel(
    modelRepo: Repository<AiModel>,
): Promise<AiModel | null> {
    const byName = await modelRepo.findOne({
        where: {
            isActive: true,
            model: BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
            modelType: "llm" as AiModel["modelType"],
        },
    });
    if (byName) return byName;
    return modelRepo.findOne({
        where: { isActive: true, modelType: "llm" as AiModel["modelType"] },
        order: { createdAt: "ASC" },
    });
}

export type BowiPlatformAgentPromptProfile = {
    description: string;
    avatar: string;
    rolePrompt: string;
    openingStatement: string;
    openingQuestions: string[];
    quickCommands: Agent["quickCommands"];
    maxSteps: number;
};

export async function syncBowiPlatformAgentProfile(
    agentRepo: Repository<Agent>,
    modelRepo: Repository<AiModel>,
    mcpRepo: Repository<AiMcpServer>,
    agent: Agent,
    profile: BowiPlatformAgentPromptProfile,
    erpNameHints: string[] = DEFAULT_ERP_MCP_NAME_HINTS,
): Promise<void> {
    const model = await resolveBowiLlmModel(modelRepo);
    if (model) {
        agent.modelConfig = buildBowiPlatformModelConfig(model.id);
        agent.modelRouting = buildBowiPlatformModelRouting(model.id);
        agent.voiceConfig = undefined;
    }
    agent.description = profile.description;
    agent.avatar = profile.avatar;
    agent.rolePrompt = profile.rolePrompt;
    agent.openingStatement = profile.openingStatement;
    agent.openingQuestions = profile.openingQuestions;
    agent.quickCommands = profile.quickCommands;
    agent.maxSteps = profile.maxSteps;
    await bindBowiAndErpMcpToAgent(agentRepo, mcpRepo, agent, erpNameHints);
}

export async function ensureBowiAgentWebAndSquarePublish(
    agentRepo: Repository<Agent>,
    agent: Agent,
): Promise<void> {
    const config = (agent.publishConfig ?? {}) as {
        enableSite?: boolean;
        accessToken?: string;
    };
    agent.publishConfig = {
        ...config,
        enableSite: true,
        accessToken: config.accessToken ?? randomBytes(32).toString("hex"),
    };
    agent.squarePublishStatus = SquarePublishStatus.APPROVED;
    agent.publishedToSquare = true;
    agent.publishedAt = agent.publishedAt ?? new Date();
    await agentRepo.save(agent);
}

export function bowiModelFieldsForCreate(model: AiModel) {
    return {
        modelConfig: buildBowiPlatformModelConfig(model.id),
        modelRouting: buildBowiPlatformModelRouting(model.id),
        voiceConfig: undefined as undefined,
        publishedToSquare: true,
        squarePublishStatus: SquarePublishStatus.APPROVED,
        publishedAt: new Date(),
    };
}
