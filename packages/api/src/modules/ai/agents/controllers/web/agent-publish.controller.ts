import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel, Datasets, User } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { AgentApiKey } from "@common/decorators/agent-public-access.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Body, Get, Param, Patch } from "@nestjs/common";

import { UpdatePublishConfigDto } from "../../dto/web/publish/update-publish-config.dto";
import { AgentBillingHandler } from "../../handlers/agent-billing";
import { AgentChatRecordService } from "../../services/agent-chat-record.service";
import { AgentsService } from "../../services/agents.service";
import {
    deriveUploadTypesFromModelFeatures,
    type UploadMediaType,
} from "../../utils/derive-upload-types";
import { projectPublishedAgent } from "../../utils/agent-public-projection";
import { isOpencodeDurableTurnsEnabled } from "../../utils/opencode-durable-rollout";

@WebController("ai-agents")
export class AgentPublishWebController {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly aiModelService: AiModelService,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly agentConfigService: AgentConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
    ) {}

    @Patch(":id/publish/config")
    async updatePublishConfig(
        @Param("id") agentId: string,
        @Playground() playground: UserPlayground,
        @Body() dto: UpdatePublishConfigDto,
    ) {
        return this.agentsService.updatePublishConfig(playground, agentId, dto);
    }

    @Get(":id/publish/detail")
    @AgentApiKey()
    @BuildFileUrl(["**.avatar", "**.chatAvatar", "**.creator.avatar"])
    async getPublishDetail(@Param("id") agentId: string, @Playground() playground: UserPlayground) {
        const agent = await this.agentsService.getAgentByIdOrThrow(agentId);
        if (!agent.publishedToSquare && agent.createBy !== playground.id) {
            throw HttpErrorFactory.notFound("智能体不存在或未发布");
        }
        const stats = await this.agentChatRecordService.getStats(agentId, playground.id);
        const raw = agent as unknown as Record<string, unknown>;
        const out = {
            ...projectPublishedAgent(agent),
            conversationCount: stats.conversationCount,
            messageCount: stats.messageCount,
            durableOpencodeTurnsEnabled: isOpencodeDurableTurnsEnabled(agent),
        } as Record<string, unknown>;
        const createBy = raw.createBy as string | undefined;
        if (createBy) {
            const user = await this.userRepository.findOne({
                where: { id: createBy },
                select: { nickname: true, username: true, avatar: true },
            });
            if (user) {
                out.creator = {
                    nickname: user.nickname ?? user.username ?? "",
                    avatar: user.avatar ?? null,
                };
            }
        }

        if (
            agent.createMode === "coze" ||
            agent.createMode === "dify" ||
            agent.createMode === "opencode"
        ) {
            const agentConfig = await this.agentConfigService.getConfig();
            const currentType = agentConfig.createTypes.find(
                (item) => item.key === agent.createMode,
            );
            if (currentType?.billingMode === "points") {
                out.chatBillingRule = {
                    power: Math.max(0, Number(currentType.points ?? 0) || 0),
                    tokens: 1000,
                };
            }
            // uploadCapability is set after chat model features are loaded (see below)
        }

        const chatModelId = agent.modelConfig?.id;
        const memoryModelId = agent.modelRouting?.memoryModel?.modelId;
        const planningModelId = agent.modelRouting?.planningModel?.modelId;
        const followupModelId = agent.modelRouting?.titleModel?.modelId;
        const sttModelId = agent.voiceConfig?.stt?.modelId;
        const ttsModelId = agent.voiceConfig?.tts?.modelId;

        const roleConfigs: Array<{
            role: "chat" | "memory" | "planning" | "followup" | "stt" | "tts";
            id?: string;
        }> = [
            { role: "chat", id: chatModelId },
            { role: "memory", id: memoryModelId },
            { role: "planning", id: planningModelId },
            { role: "followup", id: followupModelId },
            { role: "stt", id: sttModelId },
            { role: "tts", id: ttsModelId },
        ];

        const modelIds = Array.from(
            new Set(roleConfigs.map((m) => m.id).filter((id): id is string => Boolean(id))),
        );

        if (modelIds.length > 0) {
            const models = await this.aiModelService.findAll({
                where: { id: In(modelIds), isActive: true },
                relations: ["provider"],
            });
            const modelMap = new Map(models.map((m) => [m.id, m]));

            const modelUsages = roleConfigs
                .filter((cfg) => cfg.id && modelMap.has(cfg.id))
                .map((cfg) => {
                    const model = modelMap.get(cfg.id!) as AiModel;
                    return {
                        role: cfg.role,
                        id: model.id,
                        name: model.name,
                        model: model.model,
                        providerName: model.provider?.name ?? null,
                        description: model.description ?? null,
                        features: model.features ?? [],
                        billingRule: model.billingRule,
                        supportsThinking: Boolean(model.thinking || model.enableThinkingParam),
                    };
                });

            if (modelUsages.length > 0) {
                out.models = modelUsages;
            }

            const chatModel = chatModelId
                ? ((modelMap.get(chatModelId) as AiModel | undefined) ?? null)
                : null;
            if (chatModel) {
                const billingRule = chatModel.billingRule;
                if (!out.chatBillingRule && billingRule) {
                    out.chatBillingRule = billingRule;
                }
                const estimatedTokensPerRound = 500;
                const estimatedPowerPerRound = this.agentBillingHandler.calculateConsumedPower(
                    estimatedTokensPerRound,
                    billingRule,
                );
                out.estimatedUsage = {
                    tokensPerRound: estimatedTokensPerRound,
                    powerPerRound: estimatedPowerPerRound,
                };
            }
        }

        if (
            agent.createMode === "coze" ||
            agent.createMode === "dify" ||
            agent.createMode === "opencode"
        ) {
            const extConfig = (agent.thirdPartyIntegration as Record<string, any> | undefined)
                ?.extendedConfig as Record<string, any> | undefined;
            const explicitTypes = Array.isArray(extConfig?.supportedUploadTypes)
                ? (extConfig.supportedUploadTypes as string[])
                : null;
            const chatFeatures =
                (out.models as Array<{ role?: string; features?: string[] }> | undefined)?.find(
                    (m) => m.role === "chat",
                )?.features ?? [];

            if (agent.createMode === "opencode") {
                const fromFeatures = deriveUploadTypesFromModelFeatures(chatFeatures);
                const supportedUploadTypes = explicitTypes?.length
                    ? Array.from(
                          new Set<UploadMediaType>([
                              ...(explicitTypes as UploadMediaType[]),
                              ...fromFeatures,
                          ]),
                      )
                    : fromFeatures;
                out.uploadCapability = { supportedUploadTypes };
            } else {
                out.uploadCapability = {
                    supportedUploadTypes: explicitTypes?.length ? explicitTypes : ["file"],
                };
            }
        }

        const datasetIds = agent.datasetIds ?? [];
        if (Array.isArray(datasetIds) && datasetIds.length > 0) {
            const datasets = await this.datasetsRepository.find({
                where: { id: In(datasetIds) },
                select: ["id", "name", "description", "publishedToSquare", "squarePublishStatus"],
            });
            out.datasets = datasets.map((d) => ({
                id: d.id,
                name: d.name,
                description: d.description ?? null,
                publishedToSquare: d.publishedToSquare,
                squarePublishStatus: d.squarePublishStatus,
            }));
        }
        return out;
    }
}
