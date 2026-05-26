import { randomBytes } from "node:crypto";

import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { AiMcpServer } from "@buildingai/db/entities/ai-mcp-server.entity";
import { AiModel } from "@buildingai/db/entities/ai-model.entity";
import { User } from "@buildingai/db/entities/user.entity";
import { BaseSeeder } from "@buildingai/db";
import {
    bowiModelFieldsForCreate,
    ensureBowiAgentWebAndSquarePublish,
    resolveBowiLlmModel,
    resolvePlatformAgentMcpServerIds,
    syncBowiPlatformAgentProfile,
} from "@buildingai/db/seeds";
import { DataSource } from "@buildingai/db/typeorm";

import { PROC_AI_SCHEMA, PROC_TABLE } from "../../proc-audit-table-names";
import {
    PROC_PLATFORM_AGENT_AVATAR,
    PROC_PLATFORM_AGENT_DESCRIPTION,
    PROC_PLATFORM_AGENT_NAME,
    PROC_PLATFORM_AGENT_OPENING_QUESTIONS,
    PROC_PLATFORM_AGENT_OPENING_STATEMENT,
    PROC_PLATFORM_AGENT_QUICK_COMMANDS,
    PROC_PLATFORM_AGENT_MAX_STEPS,
    PROC_PLATFORM_AGENT_ROLE_PROMPT,
    PROC_ERP_MCP_NAME_HINTS,
} from "../../seed-data/proc-audit-platform-agent.config";

export class ProcAuditPlatformAgentSeeder extends BaseSeeder {
    readonly name = "ProcAuditPlatformAgentSeeder";
    readonly priority = 50;

    private promptProfile() {
        return {
            description: PROC_PLATFORM_AGENT_DESCRIPTION,
            avatar: PROC_PLATFORM_AGENT_AVATAR,
            rolePrompt: PROC_PLATFORM_AGENT_ROLE_PROMPT,
            openingStatement: PROC_PLATFORM_AGENT_OPENING_STATEMENT,
            openingQuestions: PROC_PLATFORM_AGENT_OPENING_QUESTIONS,
            quickCommands: PROC_PLATFORM_AGENT_QUICK_COMMANDS,
            maxSteps: PROC_PLATFORM_AGENT_MAX_STEPS,
        };
    }

    async run(dataSource: DataSource): Promise<void> {
        const agentRepo = dataSource.getRepository(Agent);
        const modelRepo = dataSource.getRepository(AiModel);
        const mcpRepo = dataSource.getRepository(AiMcpServer);
        const userRepo = dataSource.getRepository(User);

        let agent = await agentRepo.findOne({ where: { name: PROC_PLATFORM_AGENT_NAME } });
        if (agent) {
            this.logInfo(`Platform agent already exists: ${agent.id}`);
            await syncBowiPlatformAgentProfile(
                agentRepo,
                modelRepo,
                mcpRepo,
                agent,
                this.promptProfile(),
                PROC_ERP_MCP_NAME_HINTS,
            );
            await ensureBowiAgentWebAndSquarePublish(agentRepo, agent);
            this.logInfo(`MCP bindings: ${(agent.mcpServerIds ?? []).join(", ")}`);
            await this.linkAgentToProcAuditSettings(dataSource, agent.id);
            return;
        }

        const owners = await userRepo.find({ order: { createdAt: "ASC" }, take: 1 });
        const owner = owners[0];
        if (!owner) {
            this.logError("No user found; create a platform user before seeding PROC agent");
            return;
        }

        const model = await resolveBowiLlmModel(modelRepo);
        if (!model) {
            this.logError(
                "No active LLM model found; enable ark-code-latest in console first",
            );
            return;
        }

        const mcpServerIds = await resolvePlatformAgentMcpServerIds(
            mcpRepo,
            PROC_ERP_MCP_NAME_HINTS,
        );

        agent = agentRepo.create({
            name: PROC_PLATFORM_AGENT_NAME,
            createMode: "direct",
            ...this.promptProfile(),
            showContext: true,
            showReference: true,
            enableWebSearch: false,
            enableFileUpload: false,
            chatAvatarEnabled: false,
            ...bowiModelFieldsForCreate(model),
            mcpServerIds,
            toolConfig: { requireApproval: false, toolTimeout: 30000 },
            memoryConfig: { maxUserMemories: 20, maxAgentMemories: 20 },
            autoQuestions: {
                enabled: false,
                customRuleEnabled: false,
                customRule: "",
            },
            userCount: 0,
            publishConfig: {
                enableSite: true,
                accessToken: randomBytes(32).toString("hex"),
            },
            createBy: owner.id,
        });

        agent = await agentRepo.save(agent);
        this.logSuccess(`Created platform agent "${PROC_PLATFORM_AGENT_NAME}" (${agent.id})`);
        this.logInfo(
            `Bound model: ${model.model} (${model.id}), MCP: ${mcpServerIds.join(", ")}`,
        );

        await this.linkAgentToProcAuditSettings(dataSource, agent.id);
    }

    private async linkAgentToProcAuditSettings(dataSource: DataSource, agentId: string): Promise<void> {
        const qualified = `"${PROC_AI_SCHEMA}"."${PROC_TABLE.APP_SETTINGS}"`;
        await dataSource.query(
            `
            INSERT INTO ${qualified} ("agent_id", "update_time")
            SELECT $1, NOW()
            WHERE NOT EXISTS (SELECT 1 FROM ${qualified})
            `,
            [agentId],
        );
        await dataSource.query(
            `UPDATE ${qualified} SET "agent_id" = $1, "update_time" = NOW()`,
            [agentId],
        );
        this.logSuccess(
            `Linked agent to ${PROC_AI_SCHEMA}.${PROC_TABLE.APP_SETTINGS} (agent_id=${agentId})`,
        );
    }
}
