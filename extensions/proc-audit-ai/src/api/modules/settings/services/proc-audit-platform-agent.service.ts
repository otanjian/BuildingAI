import { randomBytes } from "node:crypto";

import { McpCommunicationType, McpServerType } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { AiMcpServer } from "@buildingai/db/entities/ai-mcp-server.entity";
import { AiModel } from "@buildingai/db/entities/ai-model.entity";
import { SquarePublishStatus } from "@buildingai/db/entities/datasets.entity";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import {
    BOWI_MCP_SERVER_NAME,
    BOWI_MCP_TOOL_CATALOG,
    getBowiMcpPublicUrl,
} from "@buildingai/constants/shared/bowi-mcp.constant";
import {
    BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
    buildBowiPlatformModelConfig,
    buildBowiPlatformModelRouting,
} from "@buildingai/constants/shared/bowi-platform-agent-profile";

import { Repository } from "@buildingai/db/typeorm";

import {
    PROC_ERP_MCP_NAME_HINTS,
    PROC_PLATFORM_AGENT_AVATAR,
    PROC_PLATFORM_AGENT_DESCRIPTION,
    PROC_PLATFORM_AGENT_MAX_STEPS,
    PROC_PLATFORM_AGENT_NAME,
    PROC_PLATFORM_AGENT_OPENING_QUESTIONS,
    PROC_PLATFORM_AGENT_OPENING_STATEMENT,
    PROC_PLATFORM_AGENT_QUICK_COMMANDS,
    PROC_PLATFORM_AGENT_ROLE_PROMPT,
} from "../../../db/seed-data/proc-audit-platform-agent.config";


import { BowiMcpToolSyncService } from "../../bowi-mcp-tool-sync/bowi-mcp-tool-sync.service";
import { SettingsService } from "./settings.service";

export type AgentOptionRow = { id: string; name: string; isProcAuditDefault?: boolean };

export type AgentUpdatePreviewDto = {
    agentName: string;
    description: string;
    rolePrompt: string;
    openingStatement: string;
    openingQuestions: string[];
    quickCommands: typeof PROC_PLATFORM_AGENT_QUICK_COMMANDS;
    maxSteps: number;
    mcpServers: Array<{
        name: string;
        url: string;
        role: "bowi" | "erp";
        tools?: Array<{ name: string; description: string }>;
    }>;
    /** Right dock iframe URL after WebAPP publish is enabled (null if not provisioned yet). */
    publishEmbedUrl: string | null;
};

@Injectable()
export class ProcAuditPlatformAgentService {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepo: Repository<Agent>,
        @InjectRepository(AiModel)
        private readonly modelRepo: Repository<AiModel>,
        @InjectRepository(AiMcpServer)
        private readonly mcpRepo: Repository<AiMcpServer>,
        private readonly settingsService: SettingsService,
        private readonly bowiMcpToolSync: BowiMcpToolSyncService,
    ) {}

    async listAgentOptions(userId: string): Promise<{
        items: AgentOptionRow[];
        configuredAgentId: string | null;
        ehcsAgentId: string | null;
    }> {
        const settings = await this.settingsService.getOrCreate();
        const [mine, ehcsByName] = await Promise.all([
            this.agentRepo.find({
                where: { createBy: userId },
                order: { updatedAt: "DESC" },
                take: 100,
            }),
            this.agentRepo.findOne({ where: { name: PROC_PLATFORM_AGENT_NAME } }),
        ]);

        const map = new Map<string, AgentOptionRow>();
        for (const a of mine) {
            map.set(a.id, { id: a.id, name: a.name });
        }
        if (ehcsByName && !map.has(ehcsByName.id)) {
            map.set(ehcsByName.id, {
                id: ehcsByName.id,
                name: ehcsByName.name,
                isProcAuditDefault: true,
            });
        }

        return {
            items: Array.from(map.values()),
            configuredAgentId: settings.agentId,
            ehcsAgentId: ehcsByName?.id ?? null,
        };
    }

    async getAgentUpdatePreview(): Promise<AgentUpdatePreviewDto> {
        const ehcsUrl = getBowiMcpPublicUrl();
        const erp = await this.resolveErpMcpServer();
        const agent = await this.agentRepo.findOne({ where: { name: PROC_PLATFORM_AGENT_NAME } });
        const publishConfig = (agent?.publishConfig ?? {}) as {
            enableSite?: boolean;
            accessToken?: string | null;
        };
        const publishEmbedUrl =
            agent?.id &&
            publishConfig.enableSite &&
            publishConfig.accessToken &&
            String(publishConfig.accessToken).trim()
                ? this.buildPublishEmbedUrl(agent.id, String(publishConfig.accessToken).trim())
                : null;
        return {
            agentName: PROC_PLATFORM_AGENT_NAME,
            description: PROC_PLATFORM_AGENT_DESCRIPTION,
            rolePrompt: PROC_PLATFORM_AGENT_ROLE_PROMPT,
            openingStatement: PROC_PLATFORM_AGENT_OPENING_STATEMENT,
            openingQuestions: PROC_PLATFORM_AGENT_OPENING_QUESTIONS,
            quickCommands: PROC_PLATFORM_AGENT_QUICK_COMMANDS,
            maxSteps: PROC_PLATFORM_AGENT_MAX_STEPS,
            mcpServers: [
                {
                    name: BOWI_MCP_SERVER_NAME,
                    url: ehcsUrl,
                    role: "bowi",
                    tools: BOWI_MCP_TOOL_CATALOG.map((t) => ({
                        name: t.name,
                        description: t.description,
                    })),
                },
                ...(erp
                    ? [
                          {
                              name: erp.name,
                              url: erp.url,
                              role: "erp" as const,
                          },
                      ]
                    : []),
            ],
            publishEmbedUrl,
        };
    }

    private buildPublishEmbedUrl(agentId: string, accessToken: string): string {
        const base =
            process.env.PROC_MCP_BASE_URL?.trim() ||
            process.env.VITE_DEVELOP_APP_BASE_URL?.trim() ||
            `http://127.0.0.1:${process.env.SERVER_PORT || "4090"}`;
        return `${base.replace(/\/$/, "")}/agents/${agentId}/${encodeURIComponent(accessToken)}`;
    }

    /**
     * Ensure PROC platform agent exists, register proc-audit-mcp, and sync full profile.
     */
    async provisionForUser(userId: string): Promise<{ agentId: string; created: boolean }> {
        const [model, bowiMcpId, erpMcp] = await Promise.all([
            this.resolveDefaultModel(),
            this.ensureBowiMcpServer(userId),
            this.resolveErpMcpServer(),
        ]);

        const mcpServerIds = [bowiMcpId, erpMcp?.id].filter((id): id is string => !!id);

        let agent = await this.agentRepo.findOne({ where: { name: PROC_PLATFORM_AGENT_NAME } });
        const created = !agent;

        if (!agent) {
            agent = this.agentRepo.create({
                name: PROC_PLATFORM_AGENT_NAME,
                description: PROC_PLATFORM_AGENT_DESCRIPTION,
                createMode: "direct",
                avatar: PROC_PLATFORM_AGENT_AVATAR,
                createBy: userId,
            });
        } else if (agent.createBy !== userId) {
            agent.createBy = userId;
        }

        this.applyAgentProfile(agent, model.id, mcpServerIds);
        agent = await this.agentRepo.save(agent);
        await this.ensureWebPublish(agent);
        await this.settingsService.update({ agentId: agent.id });
        return { agentId: agent.id, created };
    }

    private applyAgentProfile(agent: Agent, modelId: string, mcpServerIds: string[]): void {
        agent.description = PROC_PLATFORM_AGENT_DESCRIPTION;
        agent.avatar = PROC_PLATFORM_AGENT_AVATAR;
        agent.rolePrompt = PROC_PLATFORM_AGENT_ROLE_PROMPT;
        agent.openingStatement = PROC_PLATFORM_AGENT_OPENING_STATEMENT;
        agent.openingQuestions = PROC_PLATFORM_AGENT_OPENING_QUESTIONS;
        agent.quickCommands = PROC_PLATFORM_AGENT_QUICK_COMMANDS;
        agent.showContext = true;
        agent.showReference = true;
        agent.enableWebSearch = false;
        agent.enableFileUpload = false;
        agent.chatAvatarEnabled = false;
        agent.modelConfig = {
            id: modelId,
            options: { temperature: 0.3, maxTokens: 8192 },
        };
        agent.mcpServerIds = mcpServerIds;
        agent.maxSteps = PROC_PLATFORM_AGENT_MAX_STEPS;
        agent.toolConfig = { requireApproval: false, toolTimeout: 30000 };
        agent.memoryConfig = agent.memoryConfig ?? {
            maxUserMemories: 20,
            maxAgentMemories: 20,
        };
        agent.autoQuestions = agent.autoQuestions ?? {
            enabled: false,
            customRuleEnabled: false,
            customRule: "",
        };
    }

    private async ensureBowiMcpServer(userId: string): Promise<string> {
        const url = getBowiMcpPublicUrl();
        let server = await this.mcpRepo.findOne({ where: { name: BOWI_MCP_SERVER_NAME } });
        if (!server) {
            server = this.mcpRepo.create({
                name: BOWI_MCP_SERVER_NAME,
                alias: "BowiAI MCP",
                description: "统一企业自治 MCP（bowi-mcp，按 appId 隔离 schema）",
                type: McpServerType.USER,
                url,
                communicationType: McpCommunicationType.STREAMABLEHTTP,
                isDisabled: false,
                connectable: false,
                creatorId: userId,
                sortOrder: 0,
            });
        } else {
            server.url = url;
            server.communicationType = McpCommunicationType.STREAMABLEHTTP;
            server.isDisabled = false;
            if (!server.creatorId) {
                server.creatorId = userId;
            }
        }
        server = await this.mcpRepo.save(server);
        const toolCount = await this.bowiMcpToolSync.syncCatalogToDatabase(server.id);
        await this.mcpRepo.update(server.id, {
            connectable: true,
            connectError: "",
        });
        if (toolCount === 0) {
            throw HttpErrorFactory.internalServerError("proc-audit-mcp tool catalog is empty");
        }
        return server.id;
    }

    private async resolveErpMcpServer(): Promise<AiMcpServer | null> {
        const servers = await this.mcpRepo.find({
            where: { isDisabled: false },
            order: { createdAt: "ASC" },
        });
        const erpCandidates = servers.filter((s) => !this.isBowiMcpServer(s.name, s.alias));
        return this.pickErpServer(erpCandidates);
    }

    private pickErpServer(servers: AiMcpServer[]): AiMcpServer | null {
        if (servers.length === 0) {
            return null;
        }
        const lower = (s: string) => s.toLowerCase();
        for (const hint of PROC_ERP_MCP_NAME_HINTS) {
            const match = servers.find(
                (s) =>
                    lower(s.name).includes(hint) || (s.alias && lower(s.alias).includes(hint)),
            );
            if (match) {
                return match;
            }
        }
        return servers[0]!;
    }

    private isBowiMcpServer(name: string, alias?: string | null): boolean {
        const lower = (s: string) => s.toLowerCase();
        return (
            lower(name) === BOWI_MCP_SERVER_NAME ||
            lower(name).includes("proc-audit-mcp") ||
            (alias != null && (lower(alias).includes("ehcs") && lower(alias).includes("mcp")))
        );
    }

    private async resolveDefaultModel(): Promise<AiModel> {
        const byName = await this.modelRepo.findOne({
            where: {
                isActive: true,
                model: BOWI_PLATFORM_AGENT_LLM_MODEL_NAME,
                modelType: "llm" as AiModel["modelType"],
            },
        });
        if (byName) return byName;

        const fallback = await this.modelRepo.findOne({
            where: { isActive: true, modelType: "llm" as AiModel["modelType"] },
            order: { createdAt: "ASC" },
        });
        if (!fallback) {
            throw HttpErrorFactory.badRequest(
                `请先在控制台启用 LLM 模型 ${BOWI_PLATFORM_AGENT_LLM_MODEL_NAME}，再更新智能体`,
            );
        }
        return fallback;
    }

    private async ensureWebPublish(agent: Agent): Promise<void> {
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
        await this.agentRepo.save(agent);
    }
}
