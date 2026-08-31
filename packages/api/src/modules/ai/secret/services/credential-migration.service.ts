import { hashInboundToken } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent, AiMcpServer, Credential, CredentialVersion, FeishuChannelConnection, WecomAibotConnection } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Optional } from "@nestjs/common";

import { CredentialCryptoService } from "@buildingai/core/modules";
import { decryptFeishuCredential } from "@modules/channel/feishu/feishu-credential.crypto";
import { decryptWecomAibotCredential } from "@modules/channel/wecom-aibot/wecom-aibot-credential.crypto";

export type LegacyCredentialMigrationReport = {
    agentsScanned: number;
    agentsWithLegacySecrets: number;
    legacyValues: number;
    migratedAgents: number;
    cleanedAgents: number;
    skippedAgents: number;
    agentsWithCredentialRefs: number;
    pendingAgents: number;
    mcpServersScanned: number;
    mcpServersWithLegacyHeaders: number;
    channelConnectionsScanned: number;
    channelConnectionsWithLegacySecrets: number;
};

/**
 * Compatibility-window migration for credentials that still live in Agent JSON.
 * New writes should use CredentialService; this service is intentionally explicit and
 * can be invoked by a one-shot operator job with an audit wrapper.
 */
@Injectable()
export class CredentialMigrationService {
    constructor(
        @InjectRepository(Agent) private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Credential) private readonly credentialRepository: Repository<Credential>,
        @InjectRepository(CredentialVersion) private readonly versionRepository: Repository<CredentialVersion>,
        private readonly crypto: CredentialCryptoService,
        @Optional() @InjectRepository(AiMcpServer) private readonly mcpRepository?: Repository<AiMcpServer>,
        @Optional() @InjectRepository(FeishuChannelConnection) private readonly feishuRepository?: Repository<FeishuChannelConnection>,
        @Optional() @InjectRepository(WecomAibotConnection) private readonly wecomRepository?: Repository<WecomAibotConnection>,
    ) {}

    async report(tenantId?: string): Promise<LegacyCredentialMigrationReport> {
        const agents = await this.agentRepository.find({
            select: ["id", "tenantId", "publishConfig"],
            ...(tenantId ? { where: { tenantId } } : {}),
        });
        let agentsWithLegacySecrets = 0;
        let legacyValues = 0;
        let migratedAgents = 0;
        let cleanedAgents = 0;
        let agentsWithCredentialRefs = 0;
        let skippedAgents = 0;
        for (const agent of agents) {
            const config = agent.publishConfig ?? {};
            const values = [config.apiKey, config.accessToken].filter((value) => typeof value === "string" && value.length > 0);
            const refs = [
                config.apiKeyCredentialRef && config.apiKeyHash,
                config.accessTokenCredentialRef && config.accessTokenHash,
            ].filter(Boolean).length;
            if (values.length) agentsWithLegacySecrets += 1;
            legacyValues += values.length;
            if (values.length && !agent.tenantId) skippedAgents += 1;
            if (refs) agentsWithCredentialRefs += 1;
            if (!values.length && refs) {
                migratedAgents += 1;
                cleanedAgents += 1;
            }
        }
        const mcpServers = this.mcpRepository ? await this.mcpRepository.find({ where: tenantId ? { tenantId } : {} as any }) : [];
        const channelConnections = [
            ...(this.feishuRepository ? await this.feishuRepository.find({ relations: ["agent"] }) : []),
            ...(this.wecomRepository ? await this.wecomRepository.find({ relations: ["agent"] }) : []),
        ].filter((connection: any) => !tenantId || connection.agent?.tenantId === tenantId);
        return {
            agentsScanned: agents.length,
            agentsWithLegacySecrets,
            legacyValues,
            migratedAgents,
            cleanedAgents,
            skippedAgents,
            agentsWithCredentialRefs,
            pendingAgents: Math.max(agentsWithLegacySecrets - migratedAgents, 0),
            mcpServersScanned: mcpServers.length,
            mcpServersWithLegacyHeaders: mcpServers.filter((server) => Boolean(server.headers && Object.keys(server.headers).length) && !server.credentialRef).length,
            channelConnectionsScanned: channelConnections.length,
            channelConnectionsWithLegacySecrets: channelConnections.filter((connection: any) => !connection.credentialRef && Boolean(connection.appSecretEncrypted || connection.botSecretEncrypted || connection.agentAccessTokenEncrypted)).length,
        };
    }

    async migrateAll(tenantId: string, actorId: string, limit = 500): Promise<{ scanned: number; migrated: number; cleaned: number; failed: number }> {
        const agents = await this.agentRepository.find({
            where: { tenantId },
            select: ["id", "publishConfig"],
            take: Math.min(Math.max(limit, 1), 5000),
        });
        let migrated = 0;
        let cleaned = 0;
        let failed = 0;
        for (const agent of agents) {
            const before = agent.publishConfig ?? {};
            const hadLegacy = Boolean(before.apiKey || before.accessToken);
            try {
                const result = await this.migrateAgent(agent.id, actorId);
                if (result.migrated) migrated += 1;
                if (hadLegacy && !result.migrated) cleaned += 1;
            } catch {
                failed += 1;
            }
        }
        if (this.mcpRepository) {
            const servers = await this.mcpRepository.find({ where: { tenantId }, take: Math.min(Math.max(limit, 1), 5000) });
            for (const server of servers) {
                if (!server.headers || Object.keys(server.headers).length === 0 || server.credentialRef) continue;
                try {
                    const ref = await this.createManagedCredential(tenantId, server.projectId, `${server.name}-mcp`, "mcp", "mcp", JSON.stringify(server.headers), actorId);
                    server.credentialRef = ref;
                    server.headers = null as any;
                    await this.mcpRepository.save(server);
                    migrated += 1;
                    cleaned += 1;
                } catch { failed += 1; }
            }
        }
        const connections = [
            ...(this.feishuRepository ? await this.feishuRepository.find({ relations: ["agent"] }) : []),
            ...(this.wecomRepository ? await this.wecomRepository.find({ relations: ["agent"] }) : []),
        ].filter((connection: any) => connection.agent?.tenantId === tenantId);
        for (const connection of connections as any[]) {
            if (connection.credentialRef) continue;
            try {
                const values = connection.appSecretEncrypted
                    ? { appSecret: decryptFeishuCredential(connection.appSecretEncrypted), agentAccessToken: decryptFeishuCredential(connection.agentAccessTokenEncrypted || "") }
                    : { botSecret: decryptWecomAibotCredential(connection.botSecretEncrypted || ""), agentAccessToken: decryptWecomAibotCredential(connection.agentAccessTokenEncrypted || "") };
                const ref = await this.createManagedCredential(tenantId, connection.agent?.projectId || null, `${connection.name}-channel`, "channel", "channel", JSON.stringify(values), actorId);
                connection.credentialRef = ref;
                if ("appSecretEncrypted" in connection) {
                    connection.appSecretEncrypted = null;
                    connection.agentAccessTokenEncrypted = null;
                    await this.feishuRepository?.save(connection);
                } else {
                    connection.botSecretEncrypted = null;
                    connection.agentAccessTokenEncrypted = null;
                    await this.wecomRepository?.save(connection);
                }
                migrated += 1;
                cleaned += 1;
            } catch { failed += 1; }
        }
        return { scanned: agents.length, migrated, cleaned, failed };
    }

    private async createManagedCredential(tenantId: string, projectId: string | null, name: string, provider: string, purpose: string, secret: string, actorId: string): Promise<string> {
        const existing = await this.credentialRepository.findOne({ where: { tenantId, projectId, name: name.slice(0, 120) } });
        const credential = existing || await this.credentialRepository.save(this.credentialRepository.create({
            tenantId, projectId, name: name.slice(0, 120), provider, purpose,
            environment: "production", scopes: [{ resource: provider, actions: ["connect"] }], status: "active",
            currentVersionId: null, expiresAt: null, lastUsedAt: null, createdBy: actorId, revokedBy: null, revokedAt: null,
        }));
        const envelope = this.crypto.encrypt(secret);
        const latest = credential.currentVersionId ? await this.versionRepository.findOne({ where: { id: credential.currentVersionId, credentialId: credential.id } }) : await this.versionRepository.findOne({ where: { credentialId: credential.id }, order: { version: "DESC" } });
        const version = await this.versionRepository.save(this.versionRepository.create({
            credentialId: credential.id, version: (latest?.version || 0) + 1, algorithm: envelope.algorithm, keyVersion: envelope.keyVersion,
            nonce: envelope.nonce, authTag: envelope.authTag, ciphertext: envelope.ciphertext,
            fingerprint: this.crypto.fingerprint(secret), expiresAt: null, overlapUntil: latest ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, revokedAt: null, createdBy: actorId,
        }));
        credential.currentVersionId = version.id;
        await this.credentialRepository.save(credential);
        return credential.id;
    }

    /** Migrate one agent and clear legacy values only after encrypted versions are saved. */
    async migrateAgent(agentId: string, actorId: string): Promise<{ migrated: boolean; credentialIds: string[] }> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        const config = agent?.publishConfig ?? {};
        if (!agent || !agent.tenantId || (!config.apiKey && !config.accessToken)) return { migrated: false, credentialIds: [] };

        const credentialIds: string[] = [];
        const nextConfig = { ...config };
        for (const [field, value] of [["apiKey", config.apiKey], ["accessToken", config.accessToken]] as const) {
            if (typeof value !== "string" || !value) continue;
            const existingRef = field === "apiKey" ? config.apiKeyCredentialRef : config.accessTokenCredentialRef;
            const existingHash = field === "apiKey" ? config.apiKeyHash : config.accessTokenHash;
            if (existingRef && existingHash) {
                delete nextConfig[field];
                continue;
            }
            const name = `${agent.name}-${field}`.slice(0, 120);
            const credentialId = await this.createManagedCredential(agent.tenantId, agent.projectId ?? null, name, "buildingai-agent-publish", field === "apiKey" ? "agent-publish-api-key" : "agent-site-access-token", value, actorId);
            credentialIds.push(credentialId);
            if (field === "apiKey") {
                nextConfig.apiKeyHash = hashInboundToken(value);
                nextConfig.apiKeyCredentialRef = credentialId;
                delete nextConfig.apiKey;
            } else {
                nextConfig.accessTokenHash = hashInboundToken(value);
                nextConfig.accessTokenCredentialRef = credentialId;
                delete nextConfig.accessToken;
            }
        }
        agent.publishConfig = nextConfig;
        await this.agentRepository.save(agent);
        return { migrated: credentialIds.length > 0, credentialIds };
    }
}
