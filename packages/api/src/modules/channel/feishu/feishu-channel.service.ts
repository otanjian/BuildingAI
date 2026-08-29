import * as Lark from "@larksuiteoapi/node-sdk";
import { randomUUID } from "node:crypto";
import { RedisService } from "@buildingai/cache";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import type { FeishuChannelConnection } from "@buildingai/db/entities/feishu-channel-connection.entity";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { User } from "@buildingai/db/entities/user.entity";
import { Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
    OnModuleInit,
    Optional,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { DeliveryReceipt } from "../../automation/domain/automation.types";
import type { FeishuAutomationCommandHandler } from "../../automation/application/automation-command.handler";
import { AutomationIntentParser } from "../../automation/application/automation-intent.parser";
import { createBowiInvocationAssertion } from "../../bowi-mcp/utils/bowi-invocation-assertion";

import type { UpdateFeishuChannelDto } from "./dto/update-feishu-channel.dto";
import type {
    FeishuChannelConfig,
    FeishuChannelEvent,
    FeishuChannelStatus,
    FeishuResolvedIdentity,
} from "./feishu-channel.types";
import {
    buildFeishuAnonymousIdentifier,
    buildFeishuStreamingCard,
    extractFeishuText,
    maskSecret,
    normalizeAgentAccessToken,
    parseAgentStreamEvent,
    parseStoredFeishuConfig,
    normalizeFeishuAppId,
    normalizeFeishuConnectionName,
    validateFeishuConfig,
} from "./feishu-channel.utils";
import {
    decryptFeishuCredential,
    encryptFeishuCredential,
    hasFeishuCredentialEncryptionKey,
} from "./feishu-credential.crypto";
import type {
    CreateFeishuConnectionDto,
    UpdateFeishuConnectionDto,
} from "./dto/update-feishu-channel.dto";
import type { QueryFeishuConnectionDto } from "./dto/query-feishu-connection.dto";

const CONFIG_GROUP = "feishu-agent-channel";
const EVENT_TTL_SECONDS = 10 * 60;
const CONVERSATION_TTL_SECONDS = 60 * 60 * 24 * 30;
const LEASE_TTL_SECONDS = 30;
const LEASE_RENEW_INTERVAL_MS = 10_000;

type ActiveConnection = {
    client: Lark.WSClient;
    apiClient: Lark.Client;
    config: FeishuChannelConfig;
};

type ConnectionRecord = FeishuChannelConnection & {
    agent?: Pick<Agent, "name" | "createMode">;
};

const STREAM_UPDATE_INTERVAL_MS = 100;
const STREAM_ELEMENT_ID = "stream_md";
const FEISHU_IDENTITY_CACHE_TTL_MS = 10 * 60 * 1000;

function resolveAgentApiDomain(): string {
    const explicitApiDomain = process.env.BUILDINGAI_API_URL?.trim();
    if (explicitApiDomain) return explicitApiDomain.replace(/\/$/, "");

    const configured = process.env.VITE_PRODUCTION_APP_BASE_URL?.trim();
    if (configured) {
        const url = new URL(configured);
        if (url.hostname === "mac.bosofts.com") url.hostname = "api.mac.bosofts.com";
        return url.toString().replace(/\/$/, "");
    }

    const appDomain = process.env.APP_DOMAIN?.trim();
    if (!appDomain) throw new Error("APP_DOMAIN is not configured");
    const url = new URL(appDomain);
    // APP_DOMAIN normally points at the web origin. In the local/proxy setup,
    // the API is exposed on the api subdomain; use it unless explicitly
    // overridden by BUILDINGAI_API_URL.
    if (url.hostname === "mac.bosofts.com") url.hostname = "api.mac.bosofts.com";
    return url.toString().replace(/\/$/, "");
}

function splitFeishuText(content: string, maxLength: number): string[] {
    const normalized = content.trim() || "Agent returned an empty response.";
    const chunks: string[] = [];
    for (let offset = 0; offset < normalized.length; offset += maxLength) {
        chunks.push(normalized.slice(offset, offset + maxLength));
    }
    return chunks;
}

type StreamingReply = {
    update(content: string): void;
    finish(summary: string): Promise<void>;
};

/**
 * Serializes and throttles CardKit updates so a fast SSE stream cannot exceed
 * Feishu's update rate. The latest full text is always retained for the final
 * update, even when an intermediate update fails.
 */
class FeishuStreamingReply implements StreamingReply {
    private latestContent = "";
    private lastSentAt = 0;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private queue: Promise<void> = Promise.resolve();
    private sequence = 0;
    private updateError: Error | undefined;

    constructor(
        private readonly apiClient: Lark.Client,
        private readonly cardId: string,
    ) {}

    update(content: string): void {
        this.latestContent = content;
        if (this.updateError) return;
        const elapsed = Date.now() - this.lastSentAt;
        if (elapsed >= STREAM_UPDATE_INTERVAL_MS) {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = undefined;
            }
            this.enqueueUpdate();
            return;
        }
        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.enqueueUpdate();
            }, STREAM_UPDATE_INTERVAL_MS - elapsed);
        }
    }

    async finish(summary: string): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (!this.updateError && this.latestContent) this.enqueueUpdate();
        await this.queue;
        const updateError = this.updateError;
        let settingsError: Error | undefined;
        try {
            await this.apiClient.cardkit.v1.card.settings({
                path: { card_id: this.cardId },
                data: {
                    settings: JSON.stringify({
                        config: { streaming_mode: false, summary: { content: summary } },
                    }),
                    sequence: ++this.sequence,
                    uuid: `s_${this.cardId}_${this.sequence}`,
                },
            });
        } catch (error) {
            settingsError = error as Error;
        }
        if (updateError || settingsError) throw updateError || settingsError;
    }

    private enqueueUpdate(): void {
        if (this.updateError || !this.latestContent) return;
        const content = this.latestContent;
        this.lastSentAt = Date.now();
        this.queue = this.queue.then(async () => {
            if (this.updateError) return;
            try {
                await this.apiClient.cardkit.v1.cardElement.content({
                    path: { card_id: this.cardId, element_id: STREAM_ELEMENT_ID },
                    data: {
                        content,
                        sequence: ++this.sequence,
                        uuid: `c_${this.cardId}_${this.sequence}`,
                    },
                });
            } catch (error) {
                this.updateError = error as Error;
            }
        });
    }
}

@Injectable()
export class FeishuChannelService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(FeishuChannelService.name);
    private readonly activeConnections = new Map<string, ActiveConnection>();
    private readonly statuses = new Map<string, FeishuChannelStatus>();
    private readonly leaseTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly leaseTokens = new Map<string, string>();
    private readonly deletedConnections = new Set<string>();
    private readonly feishuIdentityCache = new Map<
        string,
        { expiresAt: number; identity?: FeishuResolvedIdentity }
    >();
    private automationCommandHandler?: FeishuAutomationCommandHandler;

    constructor(
        private readonly dictService: DictService,
        private readonly redisService: RedisService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @Optional() private readonly moduleRef?: ModuleRef,
        @Optional()
        @Inject("FEISHU_CONNECTION_REPOSITORY")
        private readonly connectionRepository?: Repository<FeishuChannelConnection>,
        @Optional()
        @InjectRepository(User)
        private readonly userRepository?: Repository<User>,
    ) {}

    registerAutomationCommandHandler(handler: FeishuAutomationCommandHandler): void {
        if (this.automationCommandHandler === handler) return;
        this.automationCommandHandler = handler;
        this.logger.debug("Feishu automation command interceptor registered");
    }

    /** Send a proactive message without relying on an inbound message id. */
    async sendProactiveText(
        agentId: string,
        targetType: "chat" | "user",
        targetId: string,
        content: string,
        idempotencyKey: string,
    ): Promise<DeliveryReceipt> {
        const record = this.connectionRepository
            ? (await this.connectionRepository.findOne({
                  where: { id: agentId, enabled: true },
              })) ||
              (
                  await this.connectionRepository.find({
                      where: { agentId, enabled: true },
                      order: { updatedAt: "DESC" },
                      take: 1,
                  })
              )[0]
            : undefined;
        const config = record
            ? this.toRuntimeConfig(record as ConnectionRecord)
            : await this.readConfig(agentId);
        if (!config?.enabled)
            return {
                status: "failed",
                errorCode: "CHANNEL_DISABLED",
                errorMessage: "Feishu channel is disabled",
            };
        const runtimeId = this.runtimeKey(config);
        const claimed = await this.claimDelivery(runtimeId, idempotencyKey);
        if (!claimed) return { status: "delivered", errorCode: "DEDUPLICATED" };
        const active = this.activeConnections.get(runtimeId);
        const apiClient =
            active?.apiClient ||
            new Lark.Client({
                appId: config.appId,
                appSecret: config.appSecret,
                loggerLevel: Lark.LoggerLevel.error,
            });
        const chunks = splitFeishuText(content, 3800);
        try {
            let providerMessageId: string | undefined;
            for (const chunk of chunks) {
                const result = await apiClient.im.v1.message.create({
                    params: { receive_id_type: targetType === "user" ? "open_id" : "chat_id" },
                    data: {
                        receive_id: targetId,
                        msg_type: "text",
                        content: JSON.stringify({ text: chunk }),
                    },
                });
                providerMessageId = result?.data?.message_id || providerMessageId;
            }
            return { status: "delivered", providerMessageId };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const unknown = /timeout|timed out|socket|network/i.test(message);
            if (!unknown)
                await this.redisService
                    .del(this.deliveryKey(runtimeId, idempotencyKey))
                    .catch(() => undefined);
            return {
                status: unknown ? "unknown" : "failed",
                errorCode: unknown ? "PROVIDER_TIMEOUT" : "PROVIDER_REJECTED",
                errorMessage: message.slice(0, 300),
            };
        }
    }

    /** Resolve a server-side agent token for unattended execution without exposing credentials. */
    async getAutomationAccessToken(
        accountId: string | undefined,
        agentId: string,
    ): Promise<string> {
        const config = accountId
            ? await this.resolveRuntimeConfig(accountId)
            : await this.readConfig(agentId);
        if (!config || config.agentId !== agentId)
            throw HttpErrorFactory.badRequest(
                "Feishu automation account is not bound to this agent",
            );
        if (!config.agentAccessToken?.trim())
            throw HttpErrorFactory.badRequest(
                "Agent access token is not configured for unattended execution",
            );
        return config.agentAccessToken;
    }

    async validateAutomationAccount(accountId: string): Promise<void> {
        const config = await this.resolveRuntimeConfig(accountId);
        if (!config?.enabled)
            throw HttpErrorFactory.badRequest("Feishu automation account is not enabled");
    }

    async onModuleInit(): Promise<void> {
        this.resolveAutomationCommandHandler();
        let configs: FeishuChannelConfig[];
        if (this.connectionRepository) {
            await this.migrateLegacyConnections();
            const records = await this.connectionRepository.find({ relations: ["agent"] });
            configs = records
                .filter(
                    (record) =>
                        record.enabled &&
                        (record.migrationStatus === "active" ||
                            record.migrationStatus === "legacy"),
                )
                .filter((record) =>
                    Boolean(
                        record.agentId &&
                        record.appId &&
                        record.appSecretEncrypted &&
                        record.agentAccessTokenEncrypted,
                    ),
                )
                .filter((record) => record.agent?.createMode === "direct")
                .map((record) => this.toRuntimeConfig(record as ConnectionRecord));
            if (records.length === 0) configs = await this.loadConfigs();
        } else {
            configs = await this.loadConfigs();
        }
        await Promise.all(
            configs.filter((config) => config.enabled).map((config) => this.start(config)),
        );
    }

    onApplicationBootstrap(): void {
        // Module initialization order is not a safe integration boundary: ChannelModule may
        // start its clients before AutomationModule finishes constructing its providers. Retry
        // after the whole application graph is bootstrapped so every inbound event sees the
        // automation interceptor.
        this.resolveAutomationCommandHandler();
    }

    private resolveAutomationCommandHandler(): void {
        if (this.automationCommandHandler || !this.moduleRef) return;
        try {
            const handler = this.moduleRef.get<FeishuAutomationCommandHandler>(
                "FEISHU_AUTOMATION_COMMAND_HANDLER",
                { strict: false },
            );
            if (handler) this.registerAutomationCommandHandler(handler);
        } catch (error) {
            // A forwardRef graph can hide the provider during the first lifecycle hook. The
            // event-time retry below will resolve it after the application graph is complete.
            this.logger.debug(
                `Automation interceptor is not ready yet: ${(error as Error).message}`,
            );
        }
    }

    onModuleDestroy(): void {
        for (const connectionId of this.activeConnections.keys()) void this.stop(connectionId);
        for (const timer of this.leaseTimers.values()) clearInterval(timer);
        this.leaseTimers.clear();
        this.leaseTokens.clear();
    }

    async list(): Promise<FeishuChannelStatus[]> {
        if (this.connectionRepository) {
            const result = await this.listConnections({
                page: 1,
                pageSize: 100,
            } as QueryFeishuConnectionDto);
            if (result.total > 0) return result.items;
        }
        const configs = await this.loadConfigs();
        return configs.map((config) => this.toStatus(config));
    }

    private async migrateLegacyConnections(): Promise<void> {
        if (!this.connectionRepository || !hasFeishuCredentialEncryptionKey()) return;
        const records = await this.dictService.findAll({ where: { group: CONFIG_GROUP } });
        for (const record of records) {
            const existing = await this.connectionRepository.findOne({
                where: { legacySourceKey: record.key },
            });
            if (existing) continue;
            let parsed: FeishuChannelConfig | undefined;
            let migrationError: string | null = null;
            try {
                parsed = parseStoredFeishuConfig(record.value, record.key);
            } catch (error) {
                migrationError = (error as Error).message.slice(0, 500);
            }
            const agent = parsed
                ? await this.agentRepository.findOne({ where: { id: parsed.agentId } })
                : null;
            const appId = parsed?.appId?.trim() || null;
            const appSecret = parsed?.appSecret?.trim() || null;
            let status: "legacy" | "conflict" | "orphaned" = "legacy";
            if (!agent || !parsed) status = "orphaned";
            if (agent && parsed && agent.createMode !== "direct") {
                status = "orphaned";
                migrationError = "Only standard agents can be connected to Feishu";
            }
            if (status === "legacy" && agent && parsed && appId) {
                const duplicate = await this.connectionRepository.findOne({
                    where: { normalizedAppId: appId },
                });
                if (duplicate) status = "conflict";
            }
            const baseName = parsed ? `飞书连接 · ${maskSecret(appId)}` : null;
            const quarantineSuffix = status === "legacy" ? "" : ` · ${record.key.slice(-8)}`;
            const entity = this.connectionRepository.create({
                name: baseName ? `${baseName}${quarantineSuffix}` : null,
                normalizedName: baseName
                    ? normalizeFeishuConnectionName(`${baseName}${quarantineSuffix}`)
                    : null,
                agentId: agent?.id || null,
                appId,
                normalizedAppId: status === "legacy" ? appId : null,
                appSecretEncrypted: appSecret ? encryptFeishuCredential(appSecret) : null,
                agentAccessTokenEncrypted: parsed?.agentAccessToken
                    ? encryptFeishuCredential(parsed.agentAccessToken)
                    : null,
                enabled: status === "legacy" && parsed?.enabled === true,
                onlyMentioned: parsed?.onlyMentioned !== false,
                migrationStatus: status,
                migrationError:
                    migrationError ||
                    (status === "conflict"
                        ? "App ID is already bound to another connection"
                        : null),
                legacySourceKey: record.key,
            });
            await this.connectionRepository.save(entity);
        }
    }

    async listConnections(query: QueryFeishuConnectionDto) {
        if (!this.connectionRepository)
            return {
                items: [],
                total: 0,
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 15,
                totalPages: 0,
            };
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 15, 100);
        const builder = this.connectionRepository
            .createQueryBuilder("connection")
            .leftJoinAndSelect("connection.agent", "agent")
            .orderBy("connection.updatedAt", "DESC")
            .addOrderBy("connection.id", "DESC");
        if (query.agentId)
            builder.andWhere("connection.agent_id = :agentId", { agentId: query.agentId });
        if (query.enabled !== undefined)
            builder.andWhere("connection.enabled = :enabled", { enabled: query.enabled });
        if (query.keyword?.trim()) {
            const keyword = `%${query.keyword.trim().toLocaleLowerCase()}%`;
            builder.andWhere(
                "(LOWER(COALESCE(connection.name, '')) LIKE :keyword OR LOWER(COALESCE(connection.app_id, '')) LIKE :keyword OR LOWER(COALESCE(agent.name, '')) LIKE :keyword)",
                { keyword },
            );
        }
        const records = (await builder.getMany()) as ConnectionRecord[];
        const filtered = records
            .map((item) => this.toConnectionStatus(item as ConnectionRecord))
            .filter(
                (item) => !query.connectionState || item.connectionState === query.connectionState,
            );
        // Older installations may still have valid Feishu settings in Dict while the
        // connection table is empty (for example, before the encryption key was
        // configured and the startup importer could run). Keep those settings visible
        // in the list instead of presenting a misleading empty state. This fallback is
        // read-only and only returns the same masked metadata as connection records.
        if (records.length === 0) {
            const legacy = await this.loadLegacyConnectionStatuses(query);
            if (legacy.length > 0) {
                const total = legacy.length;
                const page = query.page ?? 1;
                const pageSize = Math.min(query.pageSize ?? 15, 100);
                return {
                    items: legacy.slice((page - 1) * pageSize, page * pageSize),
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                };
            }
        }
        const total = filtered.length;
        return {
            items: filtered.slice((page - 1) * pageSize, page * pageSize),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    private async loadLegacyConnectionStatuses(
        query: QueryFeishuConnectionDto,
    ): Promise<FeishuChannelStatus[]> {
        const configs = await this.loadConfigs();
        const statuses: FeishuChannelStatus[] = [];
        for (const config of configs) {
            const agent = await this.agentRepository.findOne({ where: { id: config.agentId } });
            if (!agent) continue;
            const status = {
                ...this.toStatus({ ...config, connectionId: config.agentId }),
                connectionId: config.agentId,
                name: config.name || `飞书连接 · ${maskSecret(config.appId)}`,
                agentName: agent.name,
                migrationStatus: "legacy" as const,
                hasAppSecret: true,
                hasAgentAccessToken: Boolean(config.agentAccessToken),
            };
            if (query.agentId && status.agentId !== query.agentId) continue;
            if (query.enabled !== undefined && status.enabled !== query.enabled) continue;
            if (query.connectionState && status.connectionState !== query.connectionState) continue;
            const keyword = query.keyword?.trim().toLocaleLowerCase();
            if (
                keyword &&
                ![status.name, status.agentName, status.appId]
                    .filter(Boolean)
                    .some((value) => value!.toLocaleLowerCase().includes(keyword))
            )
                continue;
            statuses.push(status);
        }
        return statuses;
    }

    async getConnection(connectionId: string): Promise<FeishuChannelStatus> {
        const record = await this.requireConnection(connectionId);
        return this.toConnectionStatus(record);
    }

    async createConnection(dto: CreateFeishuConnectionDto): Promise<FeishuChannelStatus> {
        if (!this.connectionRepository)
            throw HttpErrorFactory.badRequest("Feishu connection storage is unavailable");
        if (!hasFeishuCredentialEncryptionKey())
            throw HttpErrorFactory.badRequest("Feishu credential encryption is not configured");
        const agent = await this.agentRepository.findOne({ where: { id: dto.agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        const config = this.buildConnectionConfig(dto, false);
        await this.assertUniqueConnection(
            config.normalizedAppId,
            config.normalizedName,
            dto.agentId,
        );
        try {
            const entity = this.connectionRepository.create(
                config as unknown as FeishuChannelConnection,
            );
            const saved = await this.connectionRepository.save(entity);
            return this.toConnectionStatus({ ...saved, agent } as ConnectionRecord);
        } catch (error) {
            if (this.isUniqueViolation(error))
                throw HttpErrorFactory.conflict(
                    "Feishu App ID or connection name is already in use",
                );
            throw error;
        }
    }

    async updateConnection(
        connectionId: string,
        dto: UpdateFeishuConnectionDto,
    ): Promise<FeishuChannelStatus> {
        if (!this.connectionRepository)
            throw HttpErrorFactory.badRequest("Feishu connection storage is unavailable");
        if (!hasFeishuCredentialEncryptionKey())
            throw HttpErrorFactory.badRequest("Feishu credential encryption is not configured");
        const existing = await this.requireConnection(connectionId);
        this.deletedConnections.add(connectionId);
        const agentId = dto.agentId || existing.agentId;
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        const next = this.buildConnectionConfig({ ...dto, agentId }, existing.enabled, existing);
        await this.assertUniqueConnection(
            next.normalizedAppId,
            next.normalizedName,
            agentId,
            connectionId,
        );
        Object.assign(existing, next);
        try {
            await this.connectionRepository.save(existing);
        } catch (error) {
            if (this.isUniqueViolation(error))
                throw HttpErrorFactory.conflict(
                    "Feishu App ID or connection name is already in use",
                );
            throw error;
        }
        if (existing.enabled) {
            await this.stopConnection(connectionId);
            await this.startConnection(this.toRuntimeConfig(existing));
        }
        return this.toConnectionStatus({ ...existing, agent } as ConnectionRecord);
    }

    async testConnection(dto: UpdateFeishuConnectionDto): Promise<{ success: true }> {
        let values = dto;
        if (dto.connectionId && this.connectionRepository) {
            const existing = await this.requireConnection(dto.connectionId);
            values = {
                ...dto,
                agentId: existing.agentId || undefined,
                appId: dto.appId?.trim() || existing.appId,
                appSecret: dto.appSecret?.trim() || this.decryptSecret(existing.appSecretEncrypted),
                agentAccessToken:
                    dto.agentAccessToken?.trim() ||
                    (existing.agentAccessTokenEncrypted
                        ? this.decryptSecret(existing.agentAccessTokenEncrypted)
                        : ""),
            };
        }
        return this.test({ ...values, agentId: values.agentId || "" });
    }

    async toggleConnection(connectionId: string, enabled: boolean): Promise<FeishuChannelStatus> {
        if (!this.connectionRepository)
            throw HttpErrorFactory.badRequest("Feishu connection storage is unavailable");
        const existing = await this.requireConnection(connectionId);
        if (existing.migrationStatus !== "active" && existing.migrationStatus !== "legacy") {
            throw HttpErrorFactory.badRequest(
                "This Feishu connection requires migration repair before it can be enabled",
            );
        }
        const agent = await this.agentRepository.findOne({ where: { id: existing.agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        existing.enabled = enabled;
        await this.connectionRepository.save(existing);
        if (enabled) await this.startConnection(this.toRuntimeConfig(existing));
        else await this.stopConnection(connectionId);
        return this.toConnectionStatus({ ...existing, agent } as ConnectionRecord);
    }

    async deleteConnection(connectionId: string): Promise<void> {
        if (!this.connectionRepository)
            throw HttpErrorFactory.badRequest("Feishu connection storage is unavailable");
        const existing = await this.requireConnection(connectionId);
        existing.migrationStatus = "deleting";
        existing.enabled = false;
        await this.connectionRepository.save(existing);
        await this.stopConnection(connectionId);
        await this.clearConnectionRuntime(connectionId);
        await this.connectionRepository.delete(connectionId);
    }

    private buildConnectionConfig(
        dto: UpdateFeishuConnectionDto | CreateFeishuConnectionDto,
        enabled: boolean,
        existing?: ConnectionRecord,
    ): Partial<FeishuChannelConnection> {
        const appId = normalizeFeishuAppId(dto.appId || existing?.appId || "");
        const appSecret =
            dto.appSecret?.trim() ||
            (existing ? this.decryptSecret(existing.appSecretEncrypted) : "");
        const submittedToken = dto.agentAccessToken?.trim();
        const agentAccessToken = submittedToken
            ? normalizeAgentAccessToken(submittedToken, dto.agentId || existing?.agentId || "")
            : existing?.agentAccessTokenEncrypted
              ? this.decryptSecret(existing.agentAccessTokenEncrypted)
              : "";
        if (!appId) throw HttpErrorFactory.badRequest("Feishu app ID is required");
        if (!appSecret) throw HttpErrorFactory.badRequest("Feishu app secret is required");
        if (!agentAccessToken) throw HttpErrorFactory.badRequest("Agent access token is required");
        const name =
            dto.name?.trim() || existing?.name || `Feishu connection · ${maskSecret(appId)}`;
        if (!name) throw HttpErrorFactory.badRequest("Feishu connection name is required");
        return {
            name,
            normalizedName: normalizeFeishuConnectionName(name),
            agentId: dto.agentId || existing?.agentId,
            appId,
            normalizedAppId: appId,
            appSecretEncrypted: encryptFeishuCredential(appSecret),
            agentAccessTokenEncrypted: agentAccessToken
                ? encryptFeishuCredential(agentAccessToken)
                : null,
            enabled,
            onlyMentioned: dto.onlyMentioned ?? existing?.onlyMentioned ?? true,
            migrationStatus: existing?.migrationStatus || "active",
            legacySourceKey: existing?.legacySourceKey || null,
        };
    }

    private toRuntimeConfig(record: ConnectionRecord): FeishuChannelConfig {
        if (
            !record.agentId ||
            !record.appId ||
            !record.appSecretEncrypted ||
            !record.agentAccessTokenEncrypted
        ) {
            throw HttpErrorFactory.badRequest("Feishu connection credentials are incomplete");
        }
        return {
            connectionId: record.id,
            name: record.name || undefined,
            agentId: record.agentId,
            appId: record.appId,
            appSecret: this.decryptSecret(record.appSecretEncrypted),
            agentAccessToken: record.agentAccessTokenEncrypted
                ? this.decryptSecret(record.agentAccessTokenEncrypted)
                : "",
            enabled: record.enabled,
            onlyMentioned: record.onlyMentioned,
            migrationStatus: record.migrationStatus,
            legacySourceKey: record.legacySourceKey,
        };
    }

    private toConnectionStatus(record: ConnectionRecord): FeishuChannelStatus {
        const previous = this.statuses.get(record.id);
        const unsupportedAgent = Boolean(record.agent && record.agent.createMode !== "direct");
        return {
            connectionId: record.id,
            name: record.name || "未命名连接",
            agentId: record.agentId || "",
            agentName: record.agent?.name,
            appId: maskSecret(record.appId || ""),
            enabled: record.enabled,
            onlyMentioned: record.onlyMentioned,
            connectionState:
                unsupportedAgent ||
                record.migrationStatus === "conflict" ||
                record.migrationStatus === "orphaned"
                    ? "error"
                    : record.enabled
                      ? previous?.connectionState === "connected"
                          ? "connected"
                          : previous?.connectionState === "error"
                            ? "error"
                            : "connecting"
                      : "stopped",
            lastError: unsupportedAgent
                ? "Only standard agents can be connected to Feishu"
                : previous?.lastError,
            updatedAt: record.updatedAt?.toISOString?.() || String(record.updatedAt || ""),
            migrationStatus: record.migrationStatus,
            hasAppSecret: Boolean(record.appSecretEncrypted),
            hasAgentAccessToken: Boolean(record.agentAccessTokenEncrypted),
            migrationError: record.migrationError,
        };
    }

    private async requireConnection(connectionId: string): Promise<ConnectionRecord> {
        if (!this.connectionRepository)
            throw HttpErrorFactory.badRequest("Feishu connection storage is unavailable");
        const record = await this.connectionRepository.findOne({
            where: { id: connectionId },
            relations: ["agent"],
        });
        if (!record) throw HttpErrorFactory.notFound("Feishu connection not found");
        return record as ConnectionRecord;
    }

    private async assertUniqueConnection(
        normalizedAppId: string,
        normalizedName: string,
        agentId: string,
        excludedId?: string,
    ): Promise<void> {
        if (!this.connectionRepository) return;
        const appMatch = await this.connectionRepository.findOne({ where: { normalizedAppId } });
        if (appMatch && appMatch.id !== excludedId)
            throw HttpErrorFactory.conflict("Feishu App ID is already bound to another connection");
        const nameMatch = await this.connectionRepository.findOne({
            where: { agentId, normalizedName },
        });
        if (nameMatch && nameMatch.id !== excludedId)
            throw HttpErrorFactory.conflict("Connection name is already used by this agent");
    }

    private decryptSecret(value: string): string {
        try {
            return decryptFeishuCredential(value);
        } catch {
            throw HttpErrorFactory.badRequest("Feishu connection credentials cannot be decrypted");
        }
    }

    private isUniqueViolation(error: unknown): boolean {
        return Boolean(
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: string }).code === "23505",
        );
    }

    private async clearConnectionRuntime(connectionId: string): Promise<void> {
        if (typeof (this.redisService as any).keys !== "function") return;
        const patterns = [
            `feishu:event:${connectionId}:*`,
            `feishu:conversation:${connectionId}:*`,
            `feishu:automation:delivery:${connectionId}:*`,
            `feishu:lease:${connectionId}`,
        ];
        for (const pattern of patterns) {
            const keys = await (this.redisService as any).keys(pattern);
            if (keys.length) await (this.redisService as any).mdel?.(keys);
        }
    }

    private runtimeKey(config: FeishuChannelConfig): string {
        return config.connectionId || config.agentId;
    }

    private async acquireLease(connectionId: string): Promise<boolean> {
        if (!connectionId || typeof (this.redisService as any).executeCommand !== "function")
            return true;
        const key = `feishu:lease:${connectionId}`;
        const token = randomUUID();
        const result = await (this.redisService as any)
            .executeCommand("SET", key, token, "EX", String(LEASE_TTL_SECONDS), "NX")
            .catch(() => null);
        if (result !== "OK") return false;
        this.leaseTokens.set(connectionId, token);
        const timer = setInterval(() => {
            void (this.redisService as any)
                .executeCommand(
                    "EVAL",
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",
                    "1",
                    key,
                    token,
                    String(LEASE_TTL_SECONDS),
                )
                .then((renewed: number) => {
                    if (renewed === 0) {
                        this.logger.warn(`Feishu connection lease lost for ${connectionId}`);
                        void this.stop(connectionId);
                    }
                })
                .catch(() => undefined);
        }, LEASE_RENEW_INTERVAL_MS);
        this.leaseTimers.set(connectionId, timer);
        return true;
    }

    private async releaseLease(connectionId: string): Promise<void> {
        const timer = this.leaseTimers.get(connectionId);
        if (timer) clearInterval(timer);
        this.leaseTimers.delete(connectionId);
        const token = this.leaseTokens.get(connectionId);
        this.leaseTokens.delete(connectionId);
        if (typeof (this.redisService as any).executeCommand === "function") {
            await (this.redisService as any)
                .executeCommand(
                    "EVAL",
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                    "1",
                    `feishu:lease:${connectionId}`,
                    token || "",
                )
                .catch(() => undefined);
        }
    }

    async save(dto: UpdateFeishuChannelDto): Promise<FeishuChannelStatus> {
        if (this.connectionRepository && dto.agentId) {
            const records = await this.connectionRepository.find({
                where: { agentId: dto.agentId },
                order: { updatedAt: "DESC" },
            });
            if (records.length > 1) {
                throw HttpErrorFactory.conflict(
                    "This agent has multiple Feishu connections; use the connection ID API",
                );
            }
            if (records[0]) return this.updateConnection(records[0].id, dto);
            return this.createConnection({
                agentId: dto.agentId,
                name: dto.name?.trim() || `飞书连接 · ${maskSecret(dto.appId)}`,
                appId: dto.appId || "",
                appSecret: dto.appSecret || "",
                agentAccessToken: dto.agentAccessToken,
                enabled: dto.enabled,
                onlyMentioned: dto.onlyMentioned,
            });
        }
        const agent = await this.agentRepository.findOne({ where: { id: dto.agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        const existing = await this.readConfig(dto.agentId);
        const config: FeishuChannelConfig = {
            agentId: dto.agentId,
            appId: dto.appId?.trim() || existing?.appId || "",
            appSecret: dto.appSecret?.trim() || existing?.appSecret || "",
            agentAccessToken: dto.agentAccessToken
                ? normalizeAgentAccessToken(dto.agentAccessToken, dto.agentId)
                : existing?.agentAccessToken || "",
            enabled: dto.enabled ?? existing?.enabled ?? false,
            onlyMentioned: dto.onlyMentioned ?? existing?.onlyMentioned ?? true,
        };
        try {
            validateFeishuConfig(config);
        } catch (error) {
            config.enabled = false;
            throw HttpErrorFactory.badRequest((error as Error).message);
        }
        if (config.enabled) await this.stop(dto.agentId);
        await this.dictService.set(dto.agentId, config, {
            group: CONFIG_GROUP,
            description: "Feishu agent channel configuration",
        });
        this.statuses.set(dto.agentId, {
            ...this.toStatus(config),
            agentName: agent.name,
            connectionState: "stopped",
            updatedAt: new Date().toISOString(),
        });
        if (config.enabled) await this.start(config);
        return { ...this.toStatus(config), agentName: agent.name };
    }

    async test(dto: UpdateFeishuChannelDto): Promise<{ success: true }> {
        if (this.connectionRepository && dto.agentId) {
            const records = await this.connectionRepository.find({
                where: { agentId: dto.agentId },
                order: { updatedAt: "DESC" },
            });
            if (records.length > 1)
                throw HttpErrorFactory.conflict(
                    "This agent has multiple Feishu connections; use the connection ID API",
                );
            if (records[0]) return this.testConnection({ ...dto, connectionId: records[0].id });
        }
        const agent = await this.agentRepository.findOne({ where: { id: dto.agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        const existing = await this.readConfig(dto.agentId);
        const appId = dto.appId?.trim() || existing?.appId;
        const appSecret = dto.appSecret?.trim() || existing?.appSecret;
        const agentAccessToken = dto.agentAccessToken?.trim() || existing?.agentAccessToken || "";
        try {
            validateFeishuConfig({
                agentId: dto.agentId,
                appId: appId || "",
                appSecret: appSecret || "",
                agentAccessToken,
                enabled: false,
                onlyMentioned: true,
            });
        } catch (error) {
            throw HttpErrorFactory.badRequest((error as Error).message);
        }
        const response = await fetch(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            {
                method: "POST",
                headers: { "content-type": "application/json; charset=utf-8" },
                body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
            },
        );
        const body = (await response.json()) as { code?: number; msg?: string };
        if (!response.ok || body.code !== 0) {
            throw HttpErrorFactory.badRequest(
                `Feishu credential test failed: ${body.msg || response.statusText}`,
            );
        }
        return { success: true };
    }

    async toggle(agentId: string, enabled: boolean): Promise<FeishuChannelStatus> {
        if (this.connectionRepository) {
            const records = await this.connectionRepository.find({
                where: { agentId },
                order: { updatedAt: "DESC" },
            });
            if (records.length > 1)
                throw HttpErrorFactory.conflict(
                    "This agent has multiple Feishu connections; use the connection ID API",
                );
            if (records[0]) return this.toggleConnection(records[0].id, enabled);
        }
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        const config = await this.readConfig(agentId);
        if (!config) throw HttpErrorFactory.notFound("Feishu channel configuration not found");
        config.enabled = enabled;
        await this.dictService.set(agentId, config, {
            group: CONFIG_GROUP,
            description: "Feishu agent channel configuration",
        });
        if (enabled) await this.start(config);
        else await this.stop(agentId);
        return { ...this.toStatus(config), agentName: agent.name };
    }

    private async loadConfigs(): Promise<FeishuChannelConfig[]> {
        const records = await this.dictService.findAll({ where: { group: CONFIG_GROUP } });
        const configs: FeishuChannelConfig[] = [];
        for (const record of records) {
            try {
                const config = parseStoredFeishuConfig(record.value, record.key);
                const agent = await this.agentRepository.findOne({ where: { id: config.agentId } });
                if (!agent) throw new Error(`Agent ${config.agentId} does not exist`);
                this.assertSupportedAgent(agent);
                validateFeishuConfig(config);
                configs.push(config);
            } catch (error) {
                this.logger.warn((error as Error).message);
                this.statuses.set(record.key, {
                    agentId: record.key,
                    appId: "",
                    enabled: false,
                    onlyMentioned: true,
                    connectionState: "error",
                    lastError: "Invalid stored configuration",
                });
            }
        }
        return configs;
    }

    private assertSupportedAgent(agent: Pick<Agent, "createMode">): void {
        if (agent.createMode === "direct") return;
        throw HttpErrorFactory.badRequest("Only standard agents can be connected to Feishu");
    }

    private async readConfig(agentId: string): Promise<FeishuChannelConfig | undefined> {
        const value = await this.dictService.get<FeishuChannelConfig | undefined>(
            agentId,
            undefined,
            CONFIG_GROUP,
        );
        if (!value) return undefined;
        try {
            const config = parseStoredFeishuConfig(JSON.stringify(value), agentId);
            const agent = await this.agentRepository.findOne({ where: { id: config.agentId } });
            if (!agent) return undefined;
            validateFeishuConfig(config);
            return config;
        } catch {
            return undefined;
        }
    }

    private toStatus(config: FeishuChannelConfig): FeishuChannelStatus {
        const previous = this.statuses.get(this.runtimeKey(config));
        return {
            connectionId: config.connectionId,
            name: config.name,
            agentId: config.agentId,
            appId: maskSecret(config.appId),
            enabled: config.enabled,
            onlyMentioned: config.onlyMentioned,
            connectionState: config.enabled
                ? previous?.connectionState === "connected"
                    ? "connected"
                    : previous?.connectionState === "error"
                      ? "error"
                      : "connecting"
                : "stopped",
            lastError: previous?.lastError,
            updatedAt: previous?.updatedAt,
        };
    }

    private async start(config: FeishuChannelConfig): Promise<void> {
        const key = this.runtimeKey(config);
        if (config.connectionId && !(await this.acquireLease(config.connectionId))) {
            this.statuses.set(key, {
                ...this.toStatus(config),
                connectionState: "error",
                lastError: "Connection is owned by another instance",
            });
            return;
        }
        this.deletedConnections.delete(key);
        this.statuses.set(key, {
            ...this.toStatus(config),
            connectionState: "connecting",
            lastError: undefined,
        });
        if (!/^cli_[A-Za-z0-9]{16,}$/.test(config.appId)) {
            this.setError(
                key,
                new Error("Feishu app ID must match cli_<16 alphanumeric characters>"),
            );
            return;
        }
        try {
            const client = new Lark.WSClient({
                appId: config.appId,
                appSecret: config.appSecret,
                loggerLevel: Lark.LoggerLevel.error,
                autoReconnect: true,
                onReady: () => this.setConnected(key),
                onError: (error) => this.setError(key, error),
            });
            const apiClient = new Lark.Client({
                appId: config.appId,
                appSecret: config.appSecret,
                loggerLevel: Lark.LoggerLevel.error,
            });
            const dispatcher = new Lark.EventDispatcher({
                loggerLevel: Lark.LoggerLevel.error,
            }).register({
                "im.message.receive_v1": (event: FeishuChannelEvent) => {
                    void this.handleEvent(config, apiClient, event);
                },
            });
            this.activeConnections.set(key, { client, apiClient, config });
            await client.start({ eventDispatcher: dispatcher });
        } catch (error) {
            this.setError(key, error as Error);
            if (config.connectionId) await this.releaseLease(config.connectionId);
        }
    }

    private async stop(agentId: string): Promise<void> {
        const active = this.activeConnections.get(agentId);
        if (active) {
            active.client.close({ force: true });
            this.activeConnections.delete(agentId);
        }
        if (active?.config.connectionId) await this.releaseLease(active.config.connectionId);
        const current = this.statuses.get(agentId);
        if (current) this.statuses.set(agentId, { ...current, connectionState: "stopped" });
    }

    private async stopConnection(connectionId: string): Promise<void> {
        const runtime = this.activeConnections.get(connectionId);
        if (runtime) return this.stop(connectionId);
        const connection = this.connectionRepository
            ? await this.connectionRepository.findOne({ where: { id: connectionId } })
            : null;
        if (connection) await this.stop(connection.id);
        else await this.stop(connectionId);
    }

    private async startConnection(config: FeishuChannelConfig): Promise<void> {
        return this.start(config);
    }

    private setConnected(runtimeId: string): void {
        const current = this.statuses.get(runtimeId);
        if (current)
            this.statuses.set(runtimeId, {
                ...current,
                connectionState: "connected",
                lastError: undefined,
            });
    }

    private setError(runtimeId: string, error: Error): void {
        const current = this.statuses.get(runtimeId);
        const config = this.activeConnections.get(runtimeId)?.config;
        const safeMessage = config
            ? error.message
                  .replaceAll(config.appSecret, "[REDACTED]")
                  .replaceAll(config.agentAccessToken, "[REDACTED]")
            : error.message;
        this.logger.error(`Feishu connection failed for runtime ${runtimeId}: ${safeMessage}`);
        if (current) {
            this.statuses.set(runtimeId, {
                ...current,
                connectionState: "error",
                lastError: safeMessage.slice(0, 300),
            });
        }
    }

    private async handleEvent(
        config: FeishuChannelConfig,
        apiClient: Lark.Client,
        event: FeishuChannelEvent,
    ): Promise<void> {
        // Websocket clients can become ready while Nest is still completing lifecycle hooks.
        this.resolveAutomationCommandHandler();
        const message = event.message;
        if (!message || message.message_type !== "text" || event.sender?.sender_type === "app")
            return;
        const mentionKey = message.mentions?.[0]?.key;
        const text = extractFeishuText(message.content, mentionKey);
        if (!text) return;
        const isAutomationCommand = /^\/(?:schedule|tasks)(?:\s|$)/i.test(text);
        const isAutomationIntent = AutomationIntentParser.isReservedInteraction(text);
        if (
            config.onlyMentioned &&
            message.chat_type === "group" &&
            !message.mentions?.length &&
            !isAutomationCommand &&
            !isAutomationIntent
        )
            return;
        const eventId = event.event_id || message.message_id;
        const runtimeId = this.runtimeKey(config);
        if (this.deletedConnections.has(runtimeId)) return;
        const eventKey = `feishu:event:${runtimeId}:${eventId}`;
        if (!(await this.claimEvent(eventKey))) return;
        const agent = await this.agentRepository.findOne({ where: { id: config.agentId } });
        if (!agent || agent.createMode !== "direct") {
            await this.sendTextReply(
                apiClient,
                message.message_id,
                "此智能体类型暂不支持飞书通道，请选择标准智能体。",
            ).catch(() => undefined);
            return;
        }
        const resolvedIdentity = await this.resolveFeishuIdentity(apiClient, event);
        if (this.automationCommandHandler) {
            const handled = resolvedIdentity
                ? await this.automationCommandHandler.handle(
                      config,
                      event,
                      text,
                      eventId,
                      resolvedIdentity,
                  )
                : await this.automationCommandHandler.handle(config, event, text, eventId);
            if (handled) return;
        }
        let streamingReply: StreamingReply | undefined;
        try {
            const conversationKey = `feishu:conversation:${runtimeId}:${message.chat_id}`;
            const previousConversationId = await this.redisService.get<string>(conversationKey);
            try {
                streamingReply = await this.createStreamingReply(apiClient, message.message_id);
            } catch (error) {
                this.logger.warn(
                    `Feishu streaming card unavailable for agent ${config.agentId}: ${(error as Error).message}`,
                );
            }
            if (!streamingReply) {
                const answer = await this.callAgentStreaming(
                    config,
                    text,
                    previousConversationId || undefined,
                    message.chat_id,
                    () => undefined,
                    resolvedIdentity,
                );
                await this.storeConversation(conversationKey, answer.conversationId);
                await this.sendTextReply(apiClient, message.message_id, answer.answer);
                return;
            }

            let cardUpdateFailed = false;
            const answer = await this.callAgentStreaming(
                config,
                text,
                previousConversationId || undefined,
                message.chat_id,
                (content) => {
                    if (cardUpdateFailed) return;
                    try {
                        streamingReply.update(content);
                    } catch (error) {
                        cardUpdateFailed = true;
                        this.logger.warn(
                            `Feishu streaming card update failed for agent ${config.agentId}: ${(error as Error).message}`,
                        );
                    }
                },
                resolvedIdentity,
            );
            await this.storeConversation(conversationKey, answer.conversationId);
            if (cardUpdateFailed) {
                await this.sendTextReply(apiClient, message.message_id, answer.answer);
                return;
            }
            try {
                await streamingReply.finish(answer.answer || "Agent returned an empty response.");
            } catch (error) {
                this.logger.warn(
                    `Feishu streaming card finalization failed for agent ${config.agentId}: ${(error as Error).message}`,
                );
                await this.sendTextReply(apiClient, message.message_id, answer.answer);
            }
        } catch (error) {
            this.logger.error(
                `Feishu message handling failed for agent ${config.agentId}: ${(error as Error).message}`,
            );
            if (streamingReply) {
                streamingReply.update("处理失败，请稍后重试。");
                const finished = await streamingReply
                    .finish("处理失败，请稍后重试。")
                    .then(() => true)
                    .catch(() => false);
                if (finished) return;
            }
            await this.sendTextReply(apiClient, message.message_id, "处理失败，请稍后重试。").catch(
                () => undefined,
            );
        }
    }

    private deliveryKey(agentId: string, idempotencyKey: string): string {
        return `feishu:automation:delivery:${agentId}:${idempotencyKey}`;
    }

    private async resolveRuntimeConfig(
        accountId: string,
    ): Promise<FeishuChannelConfig | undefined> {
        const active = this.activeConnections.get(accountId);
        if (active) return active.config;
        if (this.connectionRepository) {
            const connection = await this.connectionRepository.findOne({
                where: { id: accountId },
                relations: ["agent"],
            });
            if (connection) return this.toRuntimeConfig(connection as ConnectionRecord);
        }
        return this.readConfig(accountId);
    }

    private async resolveFeishuIdentity(
        apiClient: Lark.Client,
        event: FeishuChannelEvent,
    ): Promise<FeishuResolvedIdentity | undefined> {
        const senderId = event.sender?.sender_id?.open_id || event.sender?.sender_id?.user_id;
        if (!senderId) return undefined;
        const cacheKey = `${event.message?.chat_id || ""}:${senderId}`;
        const cached = this.feishuIdentityCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) return cached.identity;

        let displayName = senderId;
        try {
            const userApi = (apiClient as any).contact?.v3?.user;
            if (typeof userApi?.get === "function") {
                const result = await userApi.get({
                    path: { user_id: senderId },
                    params: { user_id_type: "open_id" },
                });
                displayName = result?.data?.user?.name || senderId;
            }
        } catch (error) {
            this.logger.debug(
                `Unable to resolve Feishu sender profile: ${(error as Error).message}`,
            );
        }

        let identity: FeishuResolvedIdentity | undefined;
        if (this.userRepository) {
            const localUser = await this.userRepository.findOne({
                where: { nickname: displayName },
            });
            if (localUser?.id) {
                identity = {
                    localUserId: localUser.id,
                    displayName,
                };
            }
        }
        this.feishuIdentityCache.set(cacheKey, {
            expiresAt: Date.now() + FEISHU_IDENTITY_CACHE_TTL_MS,
            identity,
        });
        return identity;
    }

    private async claimDelivery(agentId: string, idempotencyKey: string): Promise<boolean> {
        const key = this.deliveryKey(agentId, idempotencyKey);
        try {
            if (typeof (this.redisService as any).executeCommand === "function") {
                const result = await this.redisService.executeCommand(
                    "SET",
                    key,
                    "1",
                    "EX",
                    String(EVENT_TTL_SECONDS),
                    "NX",
                );
                return result === "OK";
            }
        } catch {
            // Fall back to the best-effort cache path for test doubles/legacy Redis clients.
        }
        if (await this.redisService.get(key)) return false;
        await this.redisService.set(key, "1", EVENT_TTL_SECONDS);
        return true;
    }

    private async claimEvent(key: string): Promise<boolean> {
        try {
            if (typeof (this.redisService as any).executeCommand === "function") {
                const result = await this.redisService.executeCommand(
                    "SET",
                    key,
                    "1",
                    "EX",
                    String(EVENT_TTL_SECONDS),
                    "NX",
                );
                return result === "OK";
            }
        } catch {
            // Fall back to the best-effort cache path for test doubles/legacy Redis clients.
        }
        if (await this.redisService.get(key)) return false;
        await this.redisService.set(key, "1", EVENT_TTL_SECONDS);
        return true;
    }

    private async createStreamingReply(
        apiClient: Lark.Client,
        messageId: string,
        card = buildFeishuStreamingCard(),
    ): Promise<StreamingReply | undefined> {
        const cardApi = (apiClient as any).cardkit?.v1;
        if (
            typeof cardApi?.card?.create !== "function" ||
            typeof cardApi.cardElement?.content !== "function" ||
            typeof cardApi.card?.settings !== "function"
        ) {
            return undefined;
        }
        const result = await cardApi.card.create({
            data: {
                type: "card_json",
                data: JSON.stringify(card),
            },
        });
        const cardId = result?.data?.card_id;
        if (!cardId) throw new Error("Feishu streaming card creation returned no card_id");
        await apiClient.im.v1.message.reply({
            path: { message_id: messageId },
            data: {
                content: JSON.stringify({ type: "card", data: { card_id: cardId } }),
                msg_type: "interactive",
            },
        });
        return new FeishuStreamingReply(apiClient, cardId);
    }

    private async storeConversation(key: string, conversationId?: string): Promise<void> {
        if (conversationId)
            await this.redisService.set(key, conversationId, CONVERSATION_TTL_SECONDS);
    }

    private async sendTextReply(
        apiClient: Lark.Client,
        messageId: string,
        answer: string,
    ): Promise<void> {
        await apiClient.im.v1.message.reply({
            path: { message_id: messageId },
            data: {
                content: JSON.stringify({ text: answer || "Agent returned an empty response." }),
                msg_type: "text",
            },
        });
    }

    private async callAgentStreaming(
        config: FeishuChannelConfig,
        message: string,
        conversationId: string | undefined,
        chatId: string,
        onText: (content: string) => void,
        identity?: FeishuResolvedIdentity,
    ): Promise<{ answer: string; conversationId?: string }> {
        const domain = resolveAgentApiDomain();
        const identityAssertion = this.buildFeishuIdentityAssertion(config, chatId, identity);
        const response = await fetch(`${domain}/v1/chat-messages`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${config.agentAccessToken}`,
                "content-type": "application/json",
                "x-anonymous-identifier": buildFeishuAnonymousIdentifier(
                    this.runtimeKey(config),
                    chatId,
                ),
                ...(identityAssertion ? { "x-buildingai-feishu-identity": identityAssertion } : {}),
            },
            body: JSON.stringify({
                message: {
                    role: "user",
                    parts: [{ type: "text", text: message }],
                },
                responseMode: "streaming",
                ...(conversationId ? { conversationId } : {}),
            }),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            let messageText = "";
            try {
                const parsed = JSON.parse(body) as { message?: string; error?: string };
                messageText = parsed.message || parsed.error || "";
            } catch {
                // The status text below is sufficient for non-JSON upstream errors.
            }
            throw new Error(
                messageText ||
                    `Agent request returned an empty response (${response.status} ${response.statusText || "Unknown status"})`,
            );
        }

        let answer = "";
        let nextConversationId: string | undefined;
        const processLine = (line: string): void => {
            const event = parseAgentStreamEvent(line);
            if (!event) return;
            if (event.type === "text-delta" && typeof event.delta === "string") {
                answer += event.delta;
                onText(answer);
            }
            if (event.type === "data-conversation-id" && typeof event.data === "string") {
                nextConversationId = event.data;
            }
        };

        if (response.body?.getReader) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                buffer += decoder.decode(chunk.value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || "";
                lines.forEach(processLine);
            }
            buffer += decoder.decode();
            if (buffer) processLine(buffer);
        } else {
            const body = await response.text();
            body.split(/\r?\n/).forEach(processLine);
        }

        return { answer, conversationId: nextConversationId };
    }

    private buildFeishuIdentityAssertion(
        config: FeishuChannelConfig,
        chatId: string,
        identity?: FeishuResolvedIdentity,
    ): string | undefined {
        if (!identity?.localUserId) return undefined;
        try {
            return createBowiInvocationAssertion({
                userId: identity.localUserId,
                agentId: config.agentId,
                conversationId: chatId,
                authSource: "login",
                capabilities: ["automation.personal"],
            });
        } catch (error) {
            this.logger.warn(`Unable to sign Feishu sender identity: ${(error as Error).message}`);
            return undefined;
        }
    }
}
