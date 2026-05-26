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

import { PRJ_AI_SCHEMA, PRJ_TABLE } from "../../project-health-table-names";
import {
    PRJ_PLATFORM_AGENT_AVATAR,
    PRJ_PLATFORM_AGENT_DESCRIPTION,
    PRJ_PLATFORM_AGENT_NAME,
    PRJ_PLATFORM_AGENT_OPENING_QUESTIONS,
    PRJ_PLATFORM_AGENT_OPENING_STATEMENT,
    PRJ_PLATFORM_AGENT_QUICK_COMMANDS,
    PRJ_PLATFORM_AGENT_MAX_STEPS,
    PRJ_PLATFORM_AGENT_ROLE_PROMPT,
    PRJ_ERP_MCP_NAME_HINTS,
} from "../../seed-data/project-health-platform-agent.config";

export class ProjectHealthPlatformAgentSeeder extends BaseSeeder {
    readonly name = "ProjectHealthPlatformAgentSeeder";
    readonly priority = 50;

    private promptProfile() {
        return {
            description: PRJ_PLATFORM_AGENT_DESCRIPTION,
            avatar: PRJ_PLATFORM_AGENT_AVATAR,
            rolePrompt: PRJ_PLATFORM_AGENT_ROLE_PROMPT,
            openingStatement: PRJ_PLATFORM_AGENT_OPENING_STATEMENT,
            openingQuestions: PRJ_PLATFORM_AGENT_OPENING_QUESTIONS,
            quickCommands: PRJ_PLATFORM_AGENT_QUICK_COMMANDS,
            maxSteps: PRJ_PLATFORM_AGENT_MAX_STEPS,
        };
    }

    async run(dataSource: DataSource): Promise<void> {
        const agentRepo = dataSource.getRepository(Agent);
        const modelRepo = dataSource.getRepository(AiModel);
        const mcpRepo = dataSource.getRepository(AiMcpServer);
        const userRepo = dataSource.getRepository(User);

        let agent = await agentRepo.findOne({ where: { name: PRJ_PLATFORM_AGENT_NAME } });
        if (agent) {
            this.logInfo(`Platform agent already exists: ${agent.id}`);
            await syncBowiPlatformAgentProfile(
                agentRepo,
                modelRepo,
                mcpRepo,
                agent,
                this.promptProfile(),
                PRJ_ERP_MCP_NAME_HINTS,
            );
            await ensureBowiAgentWebAndSquarePublish(agentRepo, agent);
            this.logInfo(`MCP bindings: ${(agent.mcpServerIds ?? []).join(", ")}`);
            await this.linkAgentToProjectHealthSettings(dataSource, agent.id);
            return;
        }

        const owners = await userRepo.find({ order: { createdAt: "ASC" }, take: 1 });
        const owner = owners[0];
        if (!owner) {
            this.logError("No user found; create a platform user before seeding PRJ agent");
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
            PRJ_ERP_MCP_NAME_HINTS,
        );

        agent = agentRepo.create({
            name: PRJ_PLATFORM_AGENT_NAME,
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
        this.logSuccess(`Created platform agent "${PRJ_PLATFORM_AGENT_NAME}" (${agent.id})`);
        this.logInfo(
            `Bound model: ${model.model} (${model.id}), MCP: ${mcpServerIds.join(", ")}`,
        );

        await this.linkAgentToProjectHealthSettings(dataSource, agent.id);
    }

    private async linkAgentToProjectHealthSettings(dataSource: DataSource, agentId: string): Promise<void> {
        const qualified = `"${PRJ_AI_SCHEMA}"."${PRJ_TABLE.APP_SETTINGS}"`;
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
            `Linked agent to ${PRJ_AI_SCHEMA}.${PRJ_TABLE.APP_SETTINGS} (agent_id=${agentId})`,
        );
    }
}
