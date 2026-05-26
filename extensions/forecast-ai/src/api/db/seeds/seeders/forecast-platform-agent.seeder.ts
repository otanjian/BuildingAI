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

import { FCST_AI_SCHEMA, FCST_TABLE } from "../../forecast-table-names";
import {
    FCST_PLATFORM_AGENT_AVATAR,
    FCST_PLATFORM_AGENT_DESCRIPTION,
    FCST_PLATFORM_AGENT_NAME,
    FCST_PLATFORM_AGENT_OPENING_QUESTIONS,
    FCST_PLATFORM_AGENT_OPENING_STATEMENT,
    FCST_PLATFORM_AGENT_QUICK_COMMANDS,
    FCST_PLATFORM_AGENT_MAX_STEPS,
    FCST_PLATFORM_AGENT_ROLE_PROMPT,
    FCST_ERP_MCP_NAME_HINTS,
} from "../../seed-data/forecast-platform-agent.config";

export class ForecastPlatformAgentSeeder extends BaseSeeder {
    readonly name = "ForecastPlatformAgentSeeder";
    readonly priority = 50;

    private promptProfile() {
        return {
            description: FCST_PLATFORM_AGENT_DESCRIPTION,
            avatar: FCST_PLATFORM_AGENT_AVATAR,
            rolePrompt: FCST_PLATFORM_AGENT_ROLE_PROMPT,
            openingStatement: FCST_PLATFORM_AGENT_OPENING_STATEMENT,
            openingQuestions: FCST_PLATFORM_AGENT_OPENING_QUESTIONS,
            quickCommands: FCST_PLATFORM_AGENT_QUICK_COMMANDS,
            maxSteps: FCST_PLATFORM_AGENT_MAX_STEPS,
        };
    }

    async run(dataSource: DataSource): Promise<void> {
        const agentRepo = dataSource.getRepository(Agent);
        const modelRepo = dataSource.getRepository(AiModel);
        const mcpRepo = dataSource.getRepository(AiMcpServer);
        const userRepo = dataSource.getRepository(User);

        let agent = await agentRepo.findOne({ where: { name: FCST_PLATFORM_AGENT_NAME } });
        if (agent) {
            this.logInfo(`Platform agent already exists: ${agent.id}`);
            await syncBowiPlatformAgentProfile(
                agentRepo,
                modelRepo,
                mcpRepo,
                agent,
                this.promptProfile(),
                FCST_ERP_MCP_NAME_HINTS,
            );
            await ensureBowiAgentWebAndSquarePublish(agentRepo, agent);
            this.logInfo(`MCP bindings: ${(agent.mcpServerIds ?? []).join(", ")}`);
            await this.linkAgentToForecastSettings(dataSource, agent.id);
            return;
        }

        const owners = await userRepo.find({ order: { createdAt: "ASC" }, take: 1 });
        const owner = owners[0];
        if (!owner) {
            this.logError("No user found; create a platform user before seeding FCST agent");
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
            FCST_ERP_MCP_NAME_HINTS,
        );

        agent = agentRepo.create({
            name: FCST_PLATFORM_AGENT_NAME,
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
        this.logSuccess(`Created platform agent "${FCST_PLATFORM_AGENT_NAME}" (${agent.id})`);
        this.logInfo(
            `Bound model: ${model.model} (${model.id}), MCP: ${mcpServerIds.join(", ")}`,
        );

        await this.linkAgentToForecastSettings(dataSource, agent.id);
    }

    private async linkAgentToForecastSettings(dataSource: DataSource, agentId: string): Promise<void> {
        const qualified = `"${FCST_AI_SCHEMA}"."${FCST_TABLE.APP_SETTINGS}"`;
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
            `Linked agent to ${FCST_AI_SCHEMA}.${FCST_TABLE.APP_SETTINGS} (agent_id=${agentId})`,
        );
    }
}
