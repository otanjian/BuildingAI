import { randomUUID } from "node:crypto";
import { RedisService } from "@buildingai/cache";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { WecomAibotConnection } from "@buildingai/db/entities/wecom-aibot-connection.entity";
import type { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    Injectable,
    Inject,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
    Optional,
} from "@nestjs/common";
import type { WSClient, WsFrame } from "@wecom/aibot-node-sdk";

import {
    PublishedAgentChatClient,
    resolvePublishedAgentApiOrigin,
} from "../shared/published-agent-chat.client";
import type { QueryWecomAibotConnectionDto } from "./dto/query-wecom-aibot-connection.dto";
import type {
    CreateWecomAibotConnectionDto,
    TestWecomAibotConnectionDto,
    UpdateWecomAibotConnectionDto,
} from "./dto/update-wecom-aibot-connection.dto";
import type {
    WecomAibotChannelConfig,
    WecomAibotConnectionStatus,
    WecomAibotMessageBody,
} from "./wecom-aibot-channel.types";
import {
    buildWecomAnonymousIdentifier,
    extractWecomText,
    maskWecomSecret,
    normalizeWecomBotId,
    normalizeWecomConnectionName,
    resolveWecomConversationScope,
    validateWecomConfig,
} from "./wecom-aibot-channel.utils";
import { WecomAibotClientFactory } from "./wecom-aibot-client.factory";
import {
    decryptWecomAibotCredential,
    encryptWecomAibotCredential,
    hasWecomAibotCredentialEncryptionKey,
} from "./wecom-aibot-credential.crypto";
import { WecomStreamingReply } from "./wecom-streaming-reply";

const EVENT_TTL_SECONDS = 10 * 60;
const CONVERSATION_TTL_SECONDS = 60 * 60 * 24 * 30;
const LEASE_TTL_SECONDS = 30;
const LEASE_RENEW_INTERVAL_MS = 10_000;
const AGENT_REQUEST_TIMEOUT_MS = 9 * 60 * 1_000;
const STREAM_UPDATE_INTERVAL_MS = 4_000;

type ConnectionRecord = WecomAibotConnection & {
    agent?: Pick<Agent, "name" | "createMode">;
};

type ActiveConnection = {
    client: WSClient;
    config: WecomAibotChannelConfig;
    generation: string;
};

@Injectable()
export class WecomAibotChannelService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(WecomAibotChannelService.name);
    private readonly activeConnections = new Map<string, ActiveConnection>();
    private readonly statuses = new Map<string, WecomAibotConnectionStatus>();
    private readonly leaseTimers = new Map<string, ReturnType<typeof setInterval>>();
    private readonly leaseTokens = new Map<string, string>();
    private readonly deletedConnections = new Set<string>();
    private readonly scopeQueues = new Map<string, Promise<void>>();
    private readonly lastStreamUpdateAt = new Map<string, number>();
    private readonly streamSlotQueues = new Map<string, Promise<void>>();
    private readonly publishedAgentChatClient = new PublishedAgentChatClient();

    constructor(
        private readonly redisService: RedisService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(WecomAibotConnection)
        private readonly connectionRepository: Repository<WecomAibotConnection>,
        private readonly clientFactory: WecomAibotClientFactory,
        @Optional() @Inject("CREDENTIAL_RUNTIME_RESOLVER") private readonly credentialResolver?: { resolve(id: string, scope: { tenantId: string; projectId?: string | null; environment?: string; resource?: string; action?: string }): Promise<string> },
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const connections = await this.connectionRepository.find({
            where: { enabled: true },
            relations: ["agent"],
        });
        for (const connection of connections) {
            const record = connection as ConnectionRecord;
            try {
                if (record.agent) this.assertSupportedAgent(record.agent);
                await this.startConnection(await this.toRuntimeConfig(record));
            } catch (error) {
                this.setStatusError(record, error as Error);
            }
        }
    }

    async onModuleDestroy(): Promise<void> {
        await Promise.all(
            [...this.activeConnections.keys()].map((connectionId) =>
                this.stopConnection(connectionId),
            ),
        );
    }

    async listConnections(query: QueryWecomAibotConnectionDto) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 15;
        const keyword = query.keyword?.trim().toLocaleLowerCase();
        const records = (await this.connectionRepository.find({
            relations: ["agent"],
            order: { updatedAt: "DESC" },
        })) as ConnectionRecord[];
        const filtered = records
            .filter((record) => {
                const status = this.toConnectionStatus(record);
                if (query.agentId && status.agentId !== query.agentId) return false;
                if (query.enabled !== undefined && status.enabled !== query.enabled) return false;
                if (query.connectionState && status.connectionState !== query.connectionState) {
                    return false;
                }
                return (
                    !keyword ||
                    [status.name, status.agentName, record.botId]
                        .filter(Boolean)
                        .some((value) => value!.toLocaleLowerCase().includes(keyword))
                );
            })
            .map((record) => this.toConnectionStatus(record));
        return {
            items: filtered.slice((page - 1) * pageSize, page * pageSize),
            total: filtered.length,
            page,
            pageSize,
            totalPages: Math.ceil(filtered.length / pageSize),
        };
    }

    async getConnection(connectionId: string): Promise<WecomAibotConnectionStatus> {
        return this.toConnectionStatus(await this.requireConnection(connectionId));
    }

    async createConnection(
        dto: CreateWecomAibotConnectionDto,
    ): Promise<WecomAibotConnectionStatus> {
        this.assertEncryptionConfigured();
        const agent = await this.requireSupportedAgent(dto.agentId);
        const values = this.buildConnectionValues(dto, false);
        await this.assertUniqueConnection(
            values.normalizedBotId!,
            values.normalizedName!,
            dto.agentId,
        );
        try {
            const saved = await this.connectionRepository.save(
                this.connectionRepository.create(values),
            );
            return this.toConnectionStatus({ ...saved, agent } as ConnectionRecord);
        } catch (error) {
            this.rethrowUniqueViolation(error);
            throw error;
        }
    }

    async updateConnection(
        connectionId: string,
        dto: UpdateWecomAibotConnectionDto,
    ): Promise<WecomAibotConnectionStatus> {
        this.assertEncryptionConfigured();
        const existing = await this.requireConnection(connectionId);
        const agentId = dto.agentId || existing.agentId;
        const agent = await this.requireSupportedAgent(agentId);
        const values = this.buildConnectionValues({ ...dto, agentId }, existing.enabled, existing);
        const previousConfig = existing.enabled ? await this.toRuntimeConfig(existing) : undefined;
        await this.assertUniqueConnection(
            values.normalizedBotId!,
            values.normalizedName!,
            agentId,
            connectionId,
        );

        this.deletedConnections.add(connectionId);
        if (existing.enabled) await this.stopConnection(connectionId);
        Object.assign(existing, values);
        try {
            await this.connectionRepository.save(existing);
        } catch (error) {
            this.deletedConnections.delete(connectionId);
            if (previousConfig) await this.startConnection(previousConfig);
            this.rethrowUniqueViolation(error);
            throw error;
        }
        if (existing.enabled) await this.startConnection(await this.toRuntimeConfig(existing));
        else this.deletedConnections.delete(connectionId);
        return this.toConnectionStatus({ ...existing, agent } as ConnectionRecord);
    }

    async testConnection(dto: TestWecomAibotConnectionDto): Promise<{ success: true }> {
        let existing: ConnectionRecord | undefined;
        if (dto.connectionId) existing = await this.requireConnection(dto.connectionId);
        if (!existing && dto.botId?.trim()) {
            const duplicate = await this.connectionRepository.findOne({
                where: { normalizedBotId: normalizeWecomBotId(dto.botId) },
            });
            if (duplicate?.enabled) {
                throw HttpErrorFactory.conflict(
                    "Cannot test a BotID while its saved connection is enabled",
                );
            }
        }
        const agentId = dto.agentId || existing?.agentId;
        if (!agentId) throw HttpErrorFactory.badRequest("Agent ID is required");
        await this.requireSupportedAgent(agentId);

        if (existing?.enabled) {
            const state = this.statuses.get(existing.id)?.connectionState;
            if (state === "connected") return { success: true };
            throw HttpErrorFactory.badRequest(
                "Enabled connection is not authenticated on this instance",
            );
        }

        const botId = dto.botId?.trim() || existing?.botId || "";
        const botSecret =
            dto.botSecret?.trim() ||
            (existing ? this.decryptCredential(existing.botSecretEncrypted) : "");
        const agentAccessToken =
            dto.agentAccessToken?.trim() ||
            (existing ? this.decryptCredential(existing.agentAccessTokenEncrypted) : "");
        try {
            validateWecomConfig({ agentId, botId, botSecret, agentAccessToken });
        } catch (error) {
            throw HttpErrorFactory.badRequest((error as Error).message);
        }
        try {
            return await this.clientFactory.testCredentials(botId, botSecret);
        } catch (error) {
            const safeMessage = (error as Error).message
                .replaceAll(botSecret, "[REDACTED]")
                .replaceAll(agentAccessToken, "[REDACTED]");
            throw HttpErrorFactory.badRequest(`WeCom credential test failed: ${safeMessage}`);
        }
    }

    async toggleConnection(
        connectionId: string,
        enabled: boolean,
    ): Promise<WecomAibotConnectionStatus> {
        const existing = await this.requireConnection(connectionId);
        const agent = await this.requireSupportedAgent(existing.agentId);
        if (enabled) {
            this.assertEncryptionConfigured();
            existing.enabled = true;
            await this.connectionRepository.save(existing);
            await this.startConnection(await this.toRuntimeConfig(existing));
        } else {
            existing.enabled = false;
            await this.connectionRepository.save(existing);
            await this.stopConnection(connectionId);
        }
        return this.toConnectionStatus({ ...existing, agent } as ConnectionRecord);
    }

    async deleteConnection(connectionId: string): Promise<void> {
        const existing = await this.requireConnection(connectionId);
        this.deletedConnections.add(connectionId);
        existing.enabled = false;
        await this.connectionRepository.save(existing);
        await this.stopConnection(connectionId);
        await this.clearConnectionRuntime(connectionId);
        await this.connectionRepository.delete(connectionId);
    }

    private buildConnectionValues(
        dto: UpdateWecomAibotConnectionDto & { agentId?: string },
        enabled: boolean,
        existing?: ConnectionRecord,
    ): Partial<WecomAibotConnection> {
        const agentId = dto.agentId || existing?.agentId || "";
        const botId = dto.botId?.trim() || existing?.botId || "";
        if (dto.credentialRef) {
            if (!botId) throw HttpErrorFactory.badRequest("BotID is required");
            const name = dto.name?.trim() || existing?.name || `WeCom · ${maskWecomSecret(botId)}`;
            return {
                name,
                normalizedName: normalizeWecomConnectionName(name),
                agentId,
                botId: botId.trim(),
                normalizedBotId: normalizeWecomBotId(botId),
                botSecretEncrypted: null,
                agentAccessTokenEncrypted: null,
                credentialRef: dto.credentialRef,
                enabled,
            };
        }
        const botSecret =
            dto.botSecret?.trim() ||
            (existing ? this.decryptCredential(existing.botSecretEncrypted) : "");
        const agentAccessToken =
            dto.agentAccessToken?.trim() ||
            (existing ? this.decryptCredential(existing.agentAccessTokenEncrypted) : "");
        try {
            validateWecomConfig({ agentId, botId, botSecret, agentAccessToken });
        } catch (error) {
            throw HttpErrorFactory.badRequest((error as Error).message);
        }
        const normalizedBotId = normalizeWecomBotId(botId);
        const name = dto.name?.trim() || existing?.name || `WeCom · ${maskWecomSecret(botId)}`;
        if (!name) throw HttpErrorFactory.badRequest("Connection name is required");
        return {
            name,
            normalizedName: normalizeWecomConnectionName(name),
            agentId,
            botId: botId.trim(),
            normalizedBotId,
            botSecretEncrypted:
                dto.botSecret?.trim() || !existing
                    ? encryptWecomAibotCredential(botSecret)
                    : existing.botSecretEncrypted,
            agentAccessTokenEncrypted:
                dto.agentAccessToken?.trim() || !existing
                    ? encryptWecomAibotCredential(agentAccessToken)
                    : existing.agentAccessTokenEncrypted,
            credentialRef: null,
            enabled,
        };
    }

    private async requireConnection(connectionId: string): Promise<ConnectionRecord> {
        const connection = await this.connectionRepository.findOne({
            where: { id: connectionId },
            relations: ["agent"],
        });
        if (!connection) throw HttpErrorFactory.notFound("WeCom connection not found");
        return connection as ConnectionRecord;
    }

    private async requireSupportedAgent(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertSupportedAgent(agent);
        return agent;
    }

    private assertSupportedAgent(agent: Pick<Agent, "createMode">): void {
        if (agent.createMode !== "direct") {
            throw HttpErrorFactory.badRequest("Only standard agents can be connected to WeCom");
        }
    }

    private assertEncryptionConfigured(): void {
        if (!hasWecomAibotCredentialEncryptionKey()) {
            throw HttpErrorFactory.badRequest("WeCom credential encryption is not configured");
        }
    }

    private async assertUniqueConnection(
        normalizedBotId: string,
        normalizedName: string,
        agentId: string,
        excludedId?: string,
    ): Promise<void> {
        const botMatch = await this.connectionRepository.findOne({
            where: { normalizedBotId },
        });
        if (botMatch && botMatch.id !== excludedId) {
            throw HttpErrorFactory.conflict("WeCom BotID is already bound to another connection");
        }
        const nameMatch = await this.connectionRepository.findOne({
            where: { agentId, normalizedName },
        });
        if (nameMatch && nameMatch.id !== excludedId) {
            throw HttpErrorFactory.conflict("Connection name is already used by this agent");
        }
    }

    private rethrowUniqueViolation(error: unknown): void {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: string }).code === "23505"
        ) {
            throw HttpErrorFactory.conflict("WeCom BotID or connection name is already in use");
        }
    }

    private async toRuntimeConfig(record: ConnectionRecord): Promise<WecomAibotChannelConfig> {
        const managed = record.credentialRef ? await this.resolveCredentialBundle(record) : undefined;
        if (!record.credentialRef && (!record.agentAccessTokenEncrypted || !record.botSecretEncrypted)) {
            throw HttpErrorFactory.badRequest("WeCom connection credentials are incomplete");
        }
        return {
            connectionId: record.id,
            name: record.name,
            agentId: record.agentId,
            agentAccessToken: managed?.agentAccessToken || this.decryptCredential(record.agentAccessTokenEncrypted!),
            botId: record.botId,
            botSecret: managed?.botSecret || this.decryptCredential(record.botSecretEncrypted!),
            enabled: record.enabled,
        };
    }

    private async resolveCredentialBundle(record: ConnectionRecord): Promise<{ botSecret: string; agentAccessToken: string }> {
        if (!record.credentialRef) throw HttpErrorFactory.badRequest("WeCom credential reference is unavailable");
        const agent = await this.agentRepository.findOne({ where: { id: record.agentId } });
        if (!agent?.tenantId) throw HttpErrorFactory.badRequest("WeCom connection tenant is unavailable");
        if (!this.credentialResolver) throw HttpErrorFactory.badRequest("WeCom credential resolver is unavailable");
        const value = await this.credentialResolver.resolve(record.credentialRef, {
            tenantId: agent.tenantId,
            projectId: agent.projectId,
            environment: "production",
            resource: "channel",
            action: "connect",
        });
        try {
            const bundle = JSON.parse(value) as Partial<{ botSecret: string; agentAccessToken: string }>;
            if (!bundle.botSecret || !bundle.agentAccessToken) throw new Error("incomplete");
            return { botSecret: bundle.botSecret, agentAccessToken: bundle.agentAccessToken };
        } catch {
            throw HttpErrorFactory.badRequest("WeCom credential reference must contain channel credentials");
        }
    }

    private toConnectionStatus(record: ConnectionRecord): WecomAibotConnectionStatus {
        const runtime = this.statuses.get(record.id);
        const unsupportedAgent = Boolean(record.agent && record.agent.createMode !== "direct");
        return {
            connectionId: record.id,
            name: record.name,
            agentId: record.agentId,
            agentName: record.agent?.name,
            botId: maskWecomSecret(record.botId),
            enabled: record.enabled,
            connectionState: unsupportedAgent
                ? "error"
                : record.enabled
                  ? runtime?.connectionState || "connecting"
                  : "stopped",
            lastError: unsupportedAgent
                ? "Only standard agents can be connected to WeCom"
                : runtime?.lastError,
            updatedAt: record.updatedAt?.toISOString?.() || String(record.updatedAt || ""),
            hasBotSecret: Boolean(record.botSecretEncrypted),
            hasAgentAccessToken: Boolean(record.agentAccessTokenEncrypted),
        };
    }

    private decryptCredential(value: string): string {
        try {
            return decryptWecomAibotCredential(value);
        } catch {
            throw HttpErrorFactory.badRequest("WeCom connection credentials cannot be decrypted");
        }
    }

    private async startConnection(config: WecomAibotChannelConfig): Promise<void> {
        const connectionId = config.connectionId;
        await this.stopConnection(connectionId);
        if (!(await this.acquireLease(connectionId))) {
            this.statuses.set(connectionId, {
                ...this.statusFromConfig(config),
                connectionState: "error",
                lastError: "Connection is owned by another instance",
            });
            return;
        }
        const generation = randomUUID();
        this.deletedConnections.delete(connectionId);
        this.statuses.set(connectionId, {
            ...this.statusFromConfig(config),
            connectionState: "connecting",
        });
        try {
            const client = this.clientFactory.create({
                botId: config.botId,
                secret: config.botSecret,
            });
            this.activeConnections.set(connectionId, { client, config, generation });
            client.on("authenticated", () => {
                if (!this.isCurrentRuntime(connectionId, client, generation)) return;
                const current = this.statuses.get(connectionId);
                if (current) {
                    this.statuses.set(connectionId, {
                        ...current,
                        connectionState: "connected",
                        lastError: undefined,
                    });
                }
            });
            client.on("reconnecting", () => {
                if (!this.isCurrentRuntime(connectionId, client, generation)) return;
                const current = this.statuses.get(connectionId);
                if (current) {
                    this.statuses.set(connectionId, {
                        ...current,
                        connectionState: "connecting",
                    });
                }
            });
            client.on("disconnected", (reason) => {
                if (!this.isCurrentRuntime(connectionId, client, generation)) return;
                this.setStatusError(config, new Error(reason || "WeCom connection disconnected"));
            });
            client.on("error", (error) => {
                if (this.isCurrentRuntime(connectionId, client, generation)) {
                    this.setStatusError(config, error);
                }
            });
            client.on("message.text", (frame) => {
                if (!this.isCurrentRuntime(connectionId, client, generation)) return;
                void this.handleMessage(config, client, frame).catch((error) =>
                    this.logger.error(
                        `WeCom message handling failed for connection ${connectionId}: ${this.safeError(config, error as Error)}`,
                    ),
                );
            });
            client.connect();
        } catch (error) {
            this.activeConnections.delete(connectionId);
            await this.releaseLease(connectionId);
            this.setStatusError(config, error as Error);
        }
    }

    private async stopConnection(connectionId: string): Promise<void> {
        const active = this.activeConnections.get(connectionId);
        this.activeConnections.delete(connectionId);
        active?.client.disconnect();
        await this.releaseLease(connectionId);
        const current = this.statuses.get(connectionId);
        if (current) {
            this.statuses.set(connectionId, {
                ...current,
                connectionState: "stopped",
                lastError: undefined,
            });
        }
    }

    private async handleMessage(
        config: WecomAibotChannelConfig,
        client: WSClient,
        frame: WsFrame<WecomAibotMessageBody>,
    ): Promise<void> {
        const body = frame.body;
        if (!body || body.msgtype !== "text" || !body.msgid) return;
        const text = extractWecomText(body);
        const scope = resolveWecomConversationScope(body);
        if (!text || !scope || this.deletedConnections.has(config.connectionId)) return;
        if (normalizeWecomBotId(body.aibotid || "") !== normalizeWecomBotId(config.botId)) return;
        if (!(await this.claimEvent(config.connectionId, body.msgid))) return;
        return this.enqueueScope(config.connectionId, scope, async () => {
            const active = this.activeConnections.get(config.connectionId);
            if (
                !active ||
                active.client !== client ||
                this.deletedConnections.has(config.connectionId)
            ) {
                return;
            }
            const generation = active.generation;
            const canSend = () => this.canRuntimeSend(config.connectionId, client, generation);
            const conversationKey = `wecom:conversation:${config.connectionId}:${scope}`;
            const previousConversationId = await this.redisService.get<string>(conversationKey);
            const reply = new WecomStreamingReply(
                client,
                frame,
                randomUUID(),
                canSend,
                STREAM_UPDATE_INTERVAL_MS,
                20_000,
                () => this.reserveStreamUpdateSlot(config.connectionId, scope),
            );
            try {
                const result = await this.publishedAgentChatClient.stream({
                    apiOrigin: resolvePublishedAgentApiOrigin(),
                    agentAccessToken: config.agentAccessToken,
                    anonymousIdentifier: buildWecomAnonymousIdentifier(config.connectionId, scope),
                    message: text,
                    conversationId: previousConversationId || undefined,
                    onText: (content) => reply.update(content),
                    timeoutMs: AGENT_REQUEST_TIMEOUT_MS,
                });
                if (result.conversationId) {
                    await this.redisService.set(
                        conversationKey,
                        result.conversationId,
                        CONVERSATION_TTL_SECONDS,
                    );
                }
                await reply.finish(result.answer);
            } catch (error) {
                this.logger.error(
                    `WeCom Agent call failed for connection ${config.connectionId}: ${this.safeError(config, error as Error)}`,
                );
                await reply.finish("处理失败，请稍后重试。").catch(() => undefined);
            }
        });
    }

    private enqueueScope(
        connectionId: string,
        scope: string,
        operation: () => Promise<void>,
    ): Promise<void> {
        const key = `${connectionId}:${scope}`;
        const previous = this.scopeQueues.get(key) || Promise.resolve();
        const current = previous.catch(() => undefined).then(operation);
        this.scopeQueues.set(key, current);
        return current.finally(() => {
            if (this.scopeQueues.get(key) === current) this.scopeQueues.delete(key);
        });
    }

    private async reserveStreamUpdateSlot(connectionId: string, scope: string): Promise<void> {
        const key = `${connectionId}:${scope}`;
        const previous = this.streamSlotQueues.get(key) || Promise.resolve();
        const current = previous
            .catch(() => undefined)
            .then(async () => {
                const elapsed = Date.now() - (this.lastStreamUpdateAt.get(key) || 0);
                const remaining = STREAM_UPDATE_INTERVAL_MS - elapsed;
                if (remaining > 0) {
                    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
                }
                this.lastStreamUpdateAt.set(key, Date.now());
            });
        this.streamSlotQueues.set(key, current);
        await current;
        if (this.streamSlotQueues.get(key) === current) this.streamSlotQueues.delete(key);
    }

    private async claimEvent(connectionId: string, msgid: string): Promise<boolean> {
        const key = `wecom:event:${connectionId}:${msgid}`;
        try {
            if (typeof (this.redisService as any).executeCommand === "function") {
                const result = await (this.redisService as any).executeCommand(
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
            // Legacy/test cache clients use the best-effort fallback below.
        }
        if (await this.redisService.get(key)) return false;
        await this.redisService.set(key, "1", EVENT_TTL_SECONDS);
        return true;
    }

    private async acquireLease(connectionId: string): Promise<boolean> {
        if (typeof (this.redisService as any).executeCommand !== "function") return true;
        const token = randomUUID();
        const key = `wecom:lease:${connectionId}`;
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
                    if (renewed === 0 && this.leaseTokens.get(connectionId) === token) {
                        void this.handleLeaseLoss(connectionId);
                    }
                })
                .catch(() => {
                    if (this.leaseTokens.get(connectionId) === token) {
                        void this.handleLeaseLoss(connectionId);
                    }
                });
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
        if (!token || typeof (this.redisService as any).executeCommand !== "function") return;
        await (this.redisService as any)
            .executeCommand(
                "EVAL",
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                "1",
                `wecom:lease:${connectionId}`,
                token,
            )
            .catch(() => undefined);
    }

    private async handleLeaseLoss(connectionId: string): Promise<void> {
        const config = this.activeConnections.get(connectionId)?.config;
        if (!config) return;
        await this.stopConnection(connectionId);
        this.setStatusError(config, new Error("Connection lease was lost"));
    }

    private async canRuntimeSend(
        connectionId: string,
        client: WSClient,
        generation: string,
    ): Promise<boolean> {
        if (this.deletedConnections.has(connectionId)) return false;
        const active = this.activeConnections.get(connectionId);
        if (!active || active.client !== client || active.generation !== generation) return false;
        const token = this.leaseTokens.get(connectionId);
        if (!token) return true;
        return (await this.redisService.get<string>(`wecom:lease:${connectionId}`)) === token;
    }

    private isCurrentRuntime(connectionId: string, client: WSClient, generation: string): boolean {
        const active = this.activeConnections.get(connectionId);
        return Boolean(active && active.client === client && active.generation === generation);
    }

    private async clearConnectionRuntime(connectionId: string): Promise<void> {
        for (const key of this.lastStreamUpdateAt.keys()) {
            if (key.startsWith(`${connectionId}:`)) this.lastStreamUpdateAt.delete(key);
        }
        for (const key of this.streamSlotQueues.keys()) {
            if (key.startsWith(`${connectionId}:`)) this.streamSlotQueues.delete(key);
        }
        if (typeof (this.redisService as any).keys !== "function") return;
        for (const pattern of [
            `wecom:event:${connectionId}:*`,
            `wecom:conversation:${connectionId}:*`,
            `wecom:lease:${connectionId}`,
        ]) {
            const keys = await (this.redisService as any).keys(pattern);
            if (keys.length) await (this.redisService as any).mdel?.(keys);
        }
    }

    private statusFromConfig(config: WecomAibotChannelConfig): WecomAibotConnectionStatus {
        return {
            connectionId: config.connectionId,
            name: config.name,
            agentId: config.agentId,
            botId: maskWecomSecret(config.botId),
            enabled: config.enabled,
            connectionState: config.enabled ? "connecting" : "stopped",
            hasBotSecret: true,
            hasAgentAccessToken: true,
            updatedAt: new Date().toISOString(),
        };
    }

    private setStatusError(value: WecomAibotChannelConfig | ConnectionRecord, error: Error): void {
        const config: WecomAibotChannelConfig | undefined =
            "connectionId" in value ? value : undefined;
        const connectionId = config ? config.connectionId : (value as ConnectionRecord).id;
        const safeMessage = config ? this.safeError(config, error) : error.message;
        const current = this.statuses.get(connectionId);
        this.statuses.set(connectionId, {
            ...(current ||
                (config
                    ? this.statusFromConfig(config)
                    : this.toConnectionStatus(value as ConnectionRecord))),
            connectionState: "error",
            lastError: safeMessage.slice(0, 300),
        });
        this.logger.error(`WeCom connection failed for ${connectionId}: ${safeMessage}`);
    }

    private safeError(config: WecomAibotChannelConfig, error: Error): string {
        return error.message
            .replaceAll(config.botSecret, "[REDACTED]")
            .replaceAll(config.agentAccessToken, "[REDACTED]");
    }
}
