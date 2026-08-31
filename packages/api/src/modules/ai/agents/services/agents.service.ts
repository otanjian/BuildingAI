import { randomBytes } from "node:crypto";

import { BaseService } from "@buildingai/base";
import { TagType } from "@buildingai/constants/shared/tag.constant";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { AgentAssignment } from "@buildingai/db/entities/agent-assignment.entity";
import { AiMcpServer, McpServerType } from "@buildingai/db/entities/ai-mcp-server.entity";
import { Credential, CredentialVersion } from "@buildingai/db/entities";
import { Datasets } from "@buildingai/db/entities/datasets.entity";
import { SquarePublishStatus } from "@buildingai/db/entities/square-publish-status.enum";
import { Tag } from "@buildingai/db/entities/tag.entity";
import { User } from "@buildingai/db/entities/user.entity";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { ListConsoleAgentsDto } from "../dto/list-console-agents.dto";
import { CreateAgentDto } from "../dto/web/agent/create-agent.dto";
import { AgentPublishStatus, type ListMyAgentsDto } from "../dto/web/agent/list-my-agents.dto";
import type { ListSquareAgentsDto } from "../dto/web/agent/list-square-agents.dto";
import { UpdateAgentDto } from "../dto/web/agent/update-agent.dto";
import type { UpdatePublishConfigDto } from "../dto/web/publish/update-publish-config.dto";
import { CozeAgentSyncService } from "../integrations/coze-agent-sync.service";
import { DifyAgentSyncService } from "../integrations/dify-agent-sync.service";
import {
    copyThirdPartyDiscriminator,
    projectCopyContent,
    projectSquareCard,
} from "../utils/agent-public-projection";
import { SensitiveWordConfigService } from "./sensitive-word-config.service";
import { TenantScopeService } from "@modules/tenant/services/tenant-scope.service";
import { CredentialCryptoService, hashInboundToken } from "@buildingai/core/modules";
import { AgentVersionService } from "./agent-version.service";

type AgentPublishConfigWithCopy = NonNullable<Agent["publishConfig"]> & {
    allowCopy?: boolean;
};

export type PublishConfigMutationResult = Agent & {
    /** One-time bearer token returned when a public link is enabled or regenerated. */
    publishLinkToken?: string;
};

@Injectable()
export class AgentsService extends BaseService<Agent> {
    protected readonly logger = new Logger(AgentsService.name);
    private readonly defaultAvatar = "/static/images/agent.png";

    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
        @InjectRepository(AiMcpServer)
        private readonly mcpServerRepository: Repository<AiMcpServer>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        @InjectRepository(AgentAssignment)
        private readonly agentAssignmentRepository: Repository<AgentAssignment>,
        @InjectRepository(Credential)
        private readonly credentialRepository: Repository<Credential>,
        @InjectRepository(CredentialVersion)
        private readonly credentialVersionRepository: Repository<CredentialVersion>,
        private readonly cozeAgentSyncService: CozeAgentSyncService,
        private readonly difyAgentSyncService: DifyAgentSyncService,
        private readonly agentConfigService: AgentConfigService,
        private readonly sensitiveWordConfigService: SensitiveWordConfigService,
        private readonly tenantScopeService: TenantScopeService,
        private readonly credentialCrypto: CredentialCryptoService,
        private readonly agentVersionService: AgentVersionService,
    ) {
        super(agentRepository);
    }

    private async checkNameUniqueness(name: string): Promise<void> {
        const existing = await this.agentRepository.findOne({ where: { name } });
        if (existing) {
            throw HttpErrorFactory.badRequest("智能体名称已存在");
        }
    }

    private async syncAgentTags(agent: Agent, tagIds?: string[]) {
        if (!tagIds) return;
        if (tagIds.length === 0) {
            (agent as Agent & { tags?: Tag[] }).tags = [];
            return;
        }

        const tags = await this.tagRepository.find({
            where: { id: In(tagIds), type: TagType.APP },
        });
        if (tags.length !== tagIds.length) {
            throw HttpErrorFactory.badRequest("标签不存在");
        }
        (agent as Agent & { tags?: Tag[] }).tags = tags;
    }

    async createAgent(user: UserPlayground, dto: CreateAgentDto): Promise<Agent> {
        const name = dto.name?.trim();
        const description = dto.description?.trim();
        const createMode = dto.createMode || "direct";
        if (!name) throw HttpErrorFactory.badRequest("智能体名称不能为空");

        await this.checkNameUniqueness(name);

        let thirdPartyIntegration = (dto.thirdPartyIntegration || {}) as Record<string, unknown>;
        if (createMode === "opencode") {
            const extended = {
                ...((thirdPartyIntegration.extendedConfig as Record<string, unknown>) || {}),
                provider: "opencode",
                workspace:
                    (thirdPartyIntegration.extendedConfig as Record<string, unknown> | undefined)
                        ?.workspace ||
                    process.env.OPENCODE_WORKSPACE ||
                    "/home/opencodework",
                artifactDirTemplate:
                    (thirdPartyIntegration.extendedConfig as Record<string, unknown> | undefined)
                        ?.artifactDirTemplate || "artifacts/{conversationId}",
            };
            thirdPartyIntegration = {
                ...thirdPartyIntegration,
                provider: "opencode",
                baseURL:
                    (thirdPartyIntegration.baseURL as string | undefined) ||
                    process.env.OPENCODE_BASE_URL ||
                    "http://127.0.0.1:4096",
                useExternalConversation: true,
                extendedConfig: extended,
            };
        }

        const agent = this.agentRepository.create({
            name,
            description: description || undefined,
            avatar: dto.avatar || this.defaultAvatar,
            createMode,
            modelConfig: createMode === "direct" ? dto.modelConfig : undefined,
            thirdPartyIntegration,
            showContext: true,
            showReference: true,
            enableWebSearch: false,
            enableFileUpload: createMode === "opencode",
            chatAvatarEnabled: false,
            autoQuestions:
                createMode === "direct"
                    ? {
                          enabled: false,
                          customRuleEnabled: false,
                          customRule: "",
                      }
                    : undefined,
            userCount: 0,
            toolConfig: {
                requireApproval: false,
                toolTimeout: 30000,
            },
            memoryConfig: { maxUserMemories: 20, maxAgentMemories: 20 },
            createBy: user.id,
            tenantId: (user as UserPlayground & { tenantId?: string }).tenantId ?? null,
            projectId: (user as UserPlayground & { projectId?: string }).projectId ?? null,
        });

        await this.syncAgentTags(agent, dto.tagIds);
        return this.agentRepository.save(agent);
    }

    private async generateUniqueName(baseName: string): Promise<string> {
        let name = baseName.trim();
        try {
            await this.checkNameUniqueness(name);
            return name;
        } catch {
            let suffix = 1;
            while (true) {
                const candidate = `${baseName} (${suffix})`;
                try {
                    await this.checkNameUniqueness(candidate);
                    return candidate;
                } catch {
                    suffix += 1;
                }
            }
        }
    }

    async getAgentByIdOrThrow(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        return agent;
    }

    async getAgentDetail(user: UserPlayground, agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.tenantId && (user as UserPlayground & { tenantId?: string }).tenantId) {
            this.tenantScopeService.assertTenant(
                agent.tenantId,
                user as UserPlayground & { tenantId?: string },
            );
        } else if (agent.createBy !== user.id && !user.isRoot) {
            throw HttpErrorFactory.notFound("智能体不存在");
        }

        return agent;
    }

    async updateAgent(user: UserPlayground, agentId: string, dto: UpdateAgentDto): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.tenantId && (user as UserPlayground & { tenantId?: string }).tenantId) {
            this.tenantScopeService.assertTenant(
                agent.tenantId,
                user as UserPlayground & { tenantId?: string },
            );
        } else if (agent.createBy !== user.id && !user.isRoot) {
            throw HttpErrorFactory.notFound("智能体不存在");
        }

        const scopedUser = user as UserPlayground & { tenantId?: string; projectId?: string };
        if (await this.agentVersionService.hasActiveProductionRelease(agent.id, scopedUser)) {
            await this.agentVersionService.createDraftFromLegacyUpdate(agent, dto as unknown as Record<string, unknown>, {
                tenantId: scopedUser.tenantId,
                projectId: scopedUser.projectId,
                actorId: user.id,
            });
            throw HttpErrorFactory.conflict("生产版本不可原地修改，变更已保存为新的草稿版本");
        }

        const nextName = dto.name?.trim();
        if (nextName && nextName !== agent.name) {
            await this.checkNameUniqueness(nextName);
            agent.name = nextName;
        }

        if (dto.createMode !== undefined && dto.createMode !== agent.createMode) {
            throw HttpErrorFactory.badRequest("创建方式不可修改");
        }

        const next = {
            description:
                dto.description !== undefined ? (dto.description?.trim() ?? "") : undefined,
            avatar: dto.avatar ?? agent.avatar,
            thirdPartyIntegration: dto.thirdPartyIntegration ?? agent.thirdPartyIntegration ?? {},
            chatAvatar: dto.chatAvatar ?? agent.chatAvatar,
            rolePrompt: dto.rolePrompt !== undefined ? (dto.rolePrompt?.trim() ?? "") : undefined,
            showContext: dto.showContext,
            showReference: dto.showReference,
            enableWebSearch: dto.enableWebSearch,
            enableFileUpload: dto.enableFileUpload,
            chatAvatarEnabled: dto.chatAvatarEnabled,
            memoryConfig: dto.memoryConfig,
            modelConfig: dto.modelConfig,
            openingStatement:
                dto.openingStatement !== undefined
                    ? (dto.openingStatement?.trim() ?? "")
                    : undefined,
            openingQuestions: dto.openingQuestions,
            quickCommands: dto.quickCommands,
            autoQuestions: dto.autoQuestions,
            formFields: dto.formFields,
            formFieldsInputs: dto.formFieldsInputs,
            datasetIds: dto.datasetIds,
            mcpServerIds: dto.mcpServerIds,
            toolConfig: dto.toolConfig,
            maxSteps: dto.maxSteps,
            modelRouting: dto.modelRouting,
            contextConfig: dto.contextConfig,
            voiceConfig: dto.voiceConfig,
            annotationConfig: dto.annotationConfig,
        } satisfies Partial<Agent>;

        if (dto.datasetIds && dto.datasetIds.length > 0) {
            const scopedDatasets = await this.datasetsRepository.find({
                where: { id: In(dto.datasetIds) },
                select: ["id", "tenantId", "projectId"],
            });
            const tenantId = (agent as Agent & { tenantId?: string | null }).tenantId;
            const projectId = (agent as Agent & { projectId?: string | null }).projectId;
            if (scopedDatasets.length !== dto.datasetIds.length || scopedDatasets.some((d) => (tenantId && d.tenantId !== tenantId) || (projectId && d.projectId && d.projectId !== projectId))) {
                throw HttpErrorFactory.badRequest("智能体只能绑定同租户/项目的知识库");
            }
        }

        Object.assign(agent, next);
        if (agent.createMode === "coze" && dto.thirdPartyIntegration !== undefined) {
            this.cozeAgentSyncService.normalizeConfig(agent);
        }
        if (agent.createMode === "dify" && dto.thirdPartyIntegration !== undefined) {
            this.difyAgentSyncService.normalizeConfig(agent);
        }
        if (agent.createMode === "opencode" && dto.thirdPartyIntegration !== undefined) {
            const normalized = {
                ...(agent.thirdPartyIntegration ?? {}),
                provider: "opencode" as const,
                extendedConfig: {
                    ...(agent.thirdPartyIntegration?.extendedConfig ?? {}),
                    provider: "opencode",
                    workspace:
                        agent.thirdPartyIntegration?.extendedConfig?.workspace ||
                        process.env.OPENCODE_WORKSPACE ||
                        "/home/opencodework",
                    artifactDirTemplate:
                        agent.thirdPartyIntegration?.extendedConfig?.artifactDirTemplate ||
                        "artifacts/{conversationId}",
                },
            };
            agent.thirdPartyIntegration = normalized;
        }

        if (dto.sensitiveWordConfig !== undefined) {
            this.sensitiveWordConfigService.assertCompatibilityUpdate(
                agent.sensitiveWordConfig,
                dto.sensitiveWordConfig,
            );
        }

        await this.syncAgentTags(agent, dto.tagIds);
        let savedAgent = await this.agentRepository.save(agent);
        if (dto.sensitiveWordConfig !== undefined) {
            const sensitiveWordConfig = await this.sensitiveWordConfigService.applyCompatibilityUpdate(
                user.id,
                agentId,
                dto.sensitiveWordConfig,
            );
            savedAgent = Object.assign(savedAgent, { sensitiveWordConfig });
        }

        if (savedAgent.createMode === "coze" && dto.thirdPartyIntegration !== undefined) {
            const syncResult = await this.cozeAgentSyncService.syncAgentInfo(savedAgent.id);
            return syncResult.agent ?? savedAgent;
        }

        if (savedAgent.createMode === "dify" && dto.thirdPartyIntegration !== undefined) {
            const syncResult = await this.difyAgentSyncService.syncAgentInfo(savedAgent.id);
            return syncResult.agent ?? savedAgent;
        }

        return savedAgent;
    }

    async updatePublishConfig(
        user: UserPlayground,
        agentId: string,
        dto: UpdatePublishConfigDto,
    ): Promise<PublishConfigMutationResult> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== user.id) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const scopedUser = user as UserPlayground & { tenantId?: string; projectId?: string };
        if (await this.agentVersionService.hasActiveProductionRelease(agent.id, scopedUser)) {
            await this.agentVersionService.createDraftFromLegacyUpdate(agent, dto as unknown as Record<string, unknown>, {
                tenantId: scopedUser.tenantId,
                projectId: scopedUser.projectId,
                actorId: user.id,
            });
            throw HttpErrorFactory.conflict("生产版本不可原地修改，发布配置变更已保存为草稿");
        }

        const config = (agent.publishConfig ?? {}) as AgentPublishConfigWithCopy;
        let publishLinkToken: string | undefined;

        if (dto.enableSite !== undefined) {
            config.enableSite = dto.enableSite;
            if (dto.enableSite && !config.accessTokenHash) {
                // Migrate a legacy plaintext token once, otherwise issue a new bearer.
                // A hash-only config is already enabled and must not rotate on every save.
                publishLinkToken = config.accessToken ?? randomBytes(32).toString("hex");
                config.accessTokenHash = hashInboundToken(publishLinkToken);
                config.accessTokenCredentialRef = await this.createPublishCredential(agent, publishLinkToken, user.id, "agent-site-access-token");
                delete config.accessToken;
            }
        }

        if (dto.allowCopy !== undefined) {
            config.allowCopy = dto.allowCopy;
        }

        if (dto.regenerateAccessToken === true) {
            publishLinkToken = randomBytes(32).toString("hex");
            config.accessTokenHash = hashInboundToken(publishLinkToken);
            config.accessTokenCredentialRef = await this.createPublishCredential(agent, publishLinkToken, user.id, "agent-site-access-token");
            delete config.accessToken;
            config.enableSite = true;
        }

        agent.publishConfig = config;
        const saved = await this.agentRepository.save(agent);
        return publishLinkToken ? { ...saved, publishLinkToken } : saved;
    }

    private async createPublishCredential(agent: Agent, secret: string, actorId: string, purpose: string): Promise<string> {
        // Publish tokens are stored as hashes for inbound checks; the encrypted record is retained
        // only for controlled rotation/recovery. The bearer value is returned once by the mutation
        // response so the UI can construct a link, but is never persisted in Agent JSON.
        if (!agent.tenantId) throw HttpErrorFactory.badRequest("Credential storage is not configured for this tenant");
        const name = `${agent.name}-${purpose}`.slice(0, 120);
        const existing = await this.credentialRepository.findOne({ where: { tenantId: agent.tenantId, projectId: agent.projectId ?? null, name } });
        const row = existing || await this.credentialRepository.save(this.credentialRepository.create({ tenantId: agent.tenantId, projectId: agent.projectId ?? null, name, provider: "buildingai-agent-publish", purpose, environment: "production", scopes: [{ resource: "agent", actions: ["embed"] }], status: "active", currentVersionId: null, expiresAt: null, lastUsedAt: null, createdBy: actorId, revokedBy: null, revokedAt: null }));
        const latest = row.currentVersionId
            ? await this.credentialVersionRepository.findOne({ where: { id: row.currentVersionId, credentialId: row.id } })
            : await this.credentialVersionRepository.findOne({ where: { credentialId: row.id }, order: { version: "DESC" } });
        const nextVersion = (latest?.version || 0) + 1;
        const envelope = this.credentialCrypto.encrypt(secret);
        const version = await this.credentialVersionRepository.save(this.credentialVersionRepository.create({ credentialId: row.id, version: nextVersion, algorithm: envelope.algorithm, keyVersion: envelope.keyVersion, nonce: envelope.nonce, authTag: envelope.authTag, ciphertext: envelope.ciphertext, fingerprint: this.credentialCrypto.fingerprint(secret), expiresAt: null, overlapUntil: latest ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, revokedAt: null, createdBy: actorId }));
        row.currentVersionId = version.id;
        await this.credentialRepository.save(row);
        return row.id;
    }

    async publishToSquare(
        agentId: string,
        userId: string,
        tagIds?: string[],
        options?: { allowCopy?: boolean },
    ): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== userId) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        const isAlreadyApproved =
            status === SquarePublishStatus.APPROVED || agent.publishedToSquare;

        const ids = Array.isArray(tagIds) ? tagIds.filter(Boolean) : [];
        const tags = await this.tagRepository.find({
            where: { id: In(ids), type: TagType.APP },
        });
        if (tags.length !== ids.length) {
            throw HttpErrorFactory.badRequest("标签不存在");
        }

        // Get agent config to check if publish without review is enabled
        const config = await this.agentConfigService.getConfig();
        const publishWithoutReview = config.publishWithoutReview ?? true;
        const shouldPublishImmediately = publishWithoutReview || isAlreadyApproved;

        agent.tags = tags;
        agent.publishConfig = {
            ...(agent.publishConfig ?? {}),
            allowCopy: options?.allowCopy ?? false,
        } as AgentPublishConfigWithCopy;
        if (!isAlreadyApproved) {
            agent.squareReviewedBy = null;
            agent.squareReviewedAt = null;
        }
        agent.squareRejectReason = null;

        if (shouldPublishImmediately) {
            agent.squarePublishStatus = SquarePublishStatus.APPROVED;
            agent.publishedToSquare = true;
            agent.publishedAt = agent.publishedAt ?? new Date();
        } else {
            agent.squarePublishStatus = SquarePublishStatus.PENDING;
        }

        await this.agentRepository.save(agent);

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async unpublishFromSquare(agentId: string, userId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== userId) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING && status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("该智能体未发布到广场");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.NONE,
            publishedToSquare: false,
            squareReviewedBy: null,
            squareReviewedAt: null,
            squareRejectReason: null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async approveSquarePublish(agentId: string, operatorId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核通过，仅待审核申请可操作");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.APPROVED,
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: null,
            publishedToSquare: true,
            publishedAt: agent.publishedAt ?? new Date(),
        });

        // Auto-assign the approving admin so they can verify the agent in the square
        const existingAssignment = await this.agentAssignmentRepository.findOne({
            where: { agentId, userId: operatorId },
        });
        if (!existingAssignment) {
            await this.agentAssignmentRepository.save(
                this.agentAssignmentRepository.create({
                    agentId,
                    userId: operatorId,
                    assignedBy: operatorId,
                }),
            );
        }

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async publishSquareByAdmin(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("当前状态不可上架，仅审核通过的智能体可操作");
        }
        if (agent.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该智能体已上架到广场");
        }

        await this.agentRepository.update(agentId, {
            publishedToSquare: true,
            publishedAt: new Date(),
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async unpublishSquareByAdmin(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("当前状态不可下架，仅审核通过的智能体可操作");
        }
        if (!agent.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该智能体当前未上架到广场");
        }

        await this.agentRepository.update(agentId, {
            publishedToSquare: false,
            publishedAt: null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async rejectSquarePublish(
        agentId: string,
        operatorId: string,
        reason?: string | null,
    ): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核拒绝，仅待审核申请可操作");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.REJECTED,
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: reason ?? null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async listForConsole(dto: ListConsoleAgentsDto) {
        const { name, status, tagId, ...paginationDto } = dto;
        const normalizedStatus = status as string | undefined;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .addSelect(
                "CASE WHEN a.square_publish_status = :pendingStatus THEN 0 ELSE 1 END",
                "pending_review_sort",
            )
            .leftJoinAndSelect("a.tags", "tags")
            .leftJoin(User, "u", "u.id::text = a.createBy")
            .orderBy("pending_review_sort", "ASC")
            .addOrderBy("a.createdAt", "DESC")
            .setParameter("pendingStatus", SquarePublishStatus.PENDING);

        // Console listing is platform-scoped for root operators; tenant members must use
        // the same scope helper as every other resource service.
        const tenantScopeId = (dto as ListConsoleAgentsDto & { tenantId?: string }).tenantId;
        if (tenantScopeId) this.tenantScopeService.apply(qb, "a", { tenantId: tenantScopeId });

        if (tagId) {
            qb.innerJoin("ai_agent_tags", "at", "at.agent_id = a.id AND at.tag_id = :tagId", {
                tagId,
            });
        }

        if (name?.trim()) {
            qb.andWhere(
                "(a.name ILIKE :name OR u.nickname ILIKE :name OR u.username ILIKE :name)",
                { name: `%${name.trim()}%` },
            );
        }

        if (normalizedStatus && normalizedStatus !== "all") {
            if (normalizedStatus === "published") {
                qb.andWhere("a.publishedToSquare = :published", { published: true });
                qb.andWhere("a.square_publish_status = :status", {
                    status: SquarePublishStatus.APPROVED,
                });
            } else if (normalizedStatus === "unpublished") {
                qb.andWhere("a.publishedToSquare = :published", { published: false });
                qb.andWhere("a.square_publish_status = :status", {
                    status: SquarePublishStatus.APPROVED,
                });
            } else {
                qb.andWhere("a.square_publish_status = :status", { status: normalizedStatus });
            }
        }

        const result = await this.paginateQueryBuilder(qb, paginationDto);

        // 获取统计数据
        const stats = await this.getAgentStatistics();

        return {
            ...result,
            extend: stats,
        };
    }

    /**
     * 获取智能体统计数据
     */
    private async getAgentStatistics() {
        const total = await this.agentRepository.count();

        const pending = await this.agentRepository.count({
            where: { squarePublishStatus: SquarePublishStatus.PENDING },
        });

        const published = await this.agentRepository.count({
            where: {
                publishedToSquare: true,
                squarePublishStatus: SquarePublishStatus.APPROVED,
            },
        });

        const privateCount = await this.agentRepository.count({
            where: {
                squarePublishStatus: SquarePublishStatus.NONE,
                publishedToSquare: false,
            },
        });

        const unpublished = await this.agentRepository.count({
            where: {
                squarePublishStatus: SquarePublishStatus.APPROVED,
                publishedToSquare: false,
            },
        });

        return {
            total,
            pending,
            published,
            private: privateCount,
            unpublished,
        };
    }

    async listSquare(dto: ListSquareAgentsDto, userId?: string, isRoot: boolean = false) {
        const { keyword, tagIds, ...paginationDto } = dto;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .leftJoinAndSelect("a.tags", "tags")
            .where("a.squarePublishStatus = :status", { status: SquarePublishStatus.APPROVED })
            .andWhere("a.publishedToSquare = :published", { published: true })
            .orderBy("a.updatedAt", "DESC");

        // Root users see all agents regardless of visibility
        // "all": visible to everyone; "assigned": only assigned users
        if (userId) {
            if (!isRoot) {
                qb.andWhere(
                    `(a.squareVisibility = 'all' OR (a.squareVisibility = 'assigned' AND EXISTS (SELECT 1 FROM ai_agent_assignments aa WHERE aa.agent_id = a.id AND aa.user_id = :userId)))`,
                    { userId },
                );
            }
            // Root users: no visibility filter — see all agents
        } else {
            // Unauthenticated users only see "all" visibility agents
            qb.andWhere("a.squareVisibility = :visibility", { visibility: "all" });
        }

        if (keyword?.trim()) {
            qb.andWhere("(a.name ILIKE :keyword OR a.description ILIKE :keyword)", {
                keyword: `%${keyword.trim()}%`,
            });
        }

        if (tagIds?.length) {
            qb.innerJoin(
                "ai_agent_tags",
                "at",
                "at.agent_id = a.id AND at.tag_id IN (:...tagIds)",
                { tagIds },
            );
        }

        const result = await this.paginateQueryBuilder(qb, paginationDto);
        return { ...result, items: result.items.map(projectSquareCard) };
    }

    async listMyAgents(userId: string, dto: ListMyAgentsDto) {
        const { keyword, status, ...paginationDto } = dto;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .leftJoinAndSelect("a.tags", "tags")
            .where("a.createBy = :userId", { userId })
            .orderBy("a.updatedAt", "DESC");

        if (keyword?.trim()) {
            qb.andWhere("(a.name ILIKE :keyword OR a.description ILIKE :keyword)", {
                keyword: `%${keyword.trim()}%`,
            });
        }

        if (status === AgentPublishStatus.PUBLISHED) {
            qb.andWhere("a.squarePublishStatus = :status", {
                status: SquarePublishStatus.APPROVED,
            });
            qb.andWhere("a.publishedToSquare = :published", { published: true });
        } else if (status === AgentPublishStatus.UNPUBLISHED) {
            qb.andWhere("a.publishedToSquare = :published", { published: false });
        }

        return this.paginateQueryBuilder(qb, paginationDto);
    }

    /**
     * 删除智能体
     * @param agentId 智能体ID
     * @param operatorId 操作者ID
     */
    async deleteAgent(agentId: string, _operatorId: string): Promise<void> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        // 检查智能体状态：已发布到广场的智能体不能删除
        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status === SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("已发布到广场的智能体不能删除，请先撤回广场发布");
        }

        await this.agentRepository.delete(agentId);
    }

    // ───── 智能体分配管理 ─────

    /**
     * 获取智能体已分配的用户列表
     */
    async listAssignments(agentId: string): Promise<AgentAssignment[]> {
        return this.agentAssignmentRepository.find({
            where: { agentId },
            relations: ["user"],
            select: {
                id: true,
                agentId: true,
                userId: true,
                assignedBy: true,
                createdAt: true,
                user: {
                    id: true,
                    username: true,
                    nickname: true,
                },
            },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * 批量分配用户到智能体
     * 已存在的分配关系会被跳过（不报错）
     */
    async assignUsers(agentId: string, userIds: string[], assignedBy: string): Promise<AgentAssignment[]> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const existing = await this.agentAssignmentRepository.find({
            where: { agentId, userId: In(userIds) },
        });
        const existingUserIds = new Set(existing.map((a) => a.userId));

        const newUserIds = userIds.filter((id) => !existingUserIds.has(id));
        if (newUserIds.length === 0) {
            return existing;
        }

        const assignments = this.agentAssignmentRepository.create(
            newUserIds.map((userId) => ({
                agentId,
                userId,
                assignedBy,
            })),
        );

        await this.agentAssignmentRepository.save(assignments);
        return this.listAssignments(agentId);
    }

    /**
     * 批量移除用户分配
     */
    async unassignUsers(agentId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;
        await this.agentAssignmentRepository.delete({
            agentId,
            userId: In(userIds),
        });
    }

    /**
     * 更新智能体广场可见性
     */
    async updateSquareVisibility(agentId: string, visibility: "all" | "assigned"): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        agent.squareVisibility = visibility;
        return this.agentRepository.save(agent);
    }

    async copyFromSquare(agentId: string, userId: string): Promise<Agent> {
        const source = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!source) throw HttpErrorFactory.notFound("智能体不存在");

        const status = source.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED || !source.publishedToSquare) {
            throw HttpErrorFactory.badRequest("仅支持复制已发布到广场的智能体");
        }
        const sourcePublishConfig = source.publishConfig as AgentPublishConfigWithCopy | undefined;
        if (sourcePublishConfig?.allowCopy !== true) {
            throw HttpErrorFactory.badRequest("该智能体未开放复制");
        }

        const name = await this.generateUniqueName(source.name);
        const projectedContent = projectCopyContent(source);

        const availableMcpServerIds =
            source.mcpServerIds && source.mcpServerIds.length
                ? await this.mcpServerRepository
                      .find({
                          where: {
                              id: In(source.mcpServerIds),
                              isDisabled: false,
                              type: In([McpServerType.SYSTEM, McpServerType.USER]),
                          },
                          select: ["id", "type", "creatorId"],
                      })
                      .then((items) =>
                          items
                              .filter(
                                  (s) =>
                                      s.type === McpServerType.SYSTEM ||
                                      s.creatorId === source.createBy ||
                                      s.creatorId === userId,
                              )
                              .map((s) => s.id),
                      )
                : [];

        const availableDatasetIds =
            source.datasetIds && source.datasetIds.length
                ? await this.datasetsRepository
                      .find({
                          where: { id: In(source.datasetIds) },
                          select: ["id", "createdBy", "publishedToSquare", "squarePublishStatus"],
                      })
                      .then((items) =>
                          items
                              .filter(
                                  (d) =>
                                      d.createdBy === source.createBy ||
                                      d.createdBy === userId ||
                                      d.publishedToSquare,
                              )
                              .map((d) => d.id),
                      )
                : [];

        const agent = this.agentRepository.create({
            name,
            description: source.description,
            avatar: source.avatar || this.defaultAvatar,
            createMode: source.createMode || "direct",
            thirdPartyIntegration: copyThirdPartyDiscriminator(source.thirdPartyIntegration),
            rolePrompt: source.rolePrompt,
            showContext: source.showContext,
            showReference: source.showReference,
            enableWebSearch: source.enableWebSearch,
            enableFileUpload: source.enableFileUpload,
            chatAvatarEnabled: source.chatAvatarEnabled,
            chatAvatar: source.chatAvatar,
            userCount: 0,
            toolConfig: source.toolConfig,
            memoryConfig: source.memoryConfig,
            modelConfig: source.modelConfig,
            modelRouting: source.modelRouting,
            contextConfig: source.contextConfig,
            voiceConfig: source.voiceConfig,
            annotationConfig: source.annotationConfig,
            maxSteps: source.maxSteps,
            datasetIds: availableDatasetIds,
            openingStatement: projectedContent.openingStatement,
            openingQuestions: source.openingQuestions,
            quickCommands: projectedContent.quickCommands,
            autoQuestions: source.autoQuestions,
            formFields: source.formFields,
            mcpServerIds: availableMcpServerIds,
            publishedToSquare: false,
            publishedAt: null,
            publishConfig: {},
            squarePublishStatus: SquarePublishStatus.NONE,
            squareReviewedBy: null,
            squareReviewedAt: null,
            squareRejectReason: null,
            createBy: userId,
        });

        await this.syncAgentTags(agent, source.tags?.map((t) => t.id) ?? []);
        return this.agentRepository.save(agent);
    }
}
