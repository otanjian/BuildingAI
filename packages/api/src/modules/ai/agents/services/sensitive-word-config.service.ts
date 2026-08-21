import type {
    SensitiveWordConfig,
    SensitiveWordConfigUpdate,
} from "@buildingai/types/ai/agent-config.interface";
import {
    getSensitiveWordRevision,
    resolveSensitiveWordCompatibilityUpdate,
    serializeSensitiveWordConfig,
    validateSensitiveWordRules,
} from "@buildingai/utils/sensitive-word-config";
import { Agent } from "@buildingai/db/entities/ai-agent.entity";
import { DataSource, EntityManager, EntityMetadata } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SensitiveWordConfigService {
    constructor(private readonly dataSource: DataSource) {}

    assertCompatibilityUpdate(stored: unknown, incoming: unknown): void {
        const resolution = resolveSensitiveWordCompatibilityUpdate(stored, incoming);
        if (resolution.action === "conflict") {
            this.throwCompatibilityConflict(resolution.reasonCode);
        }
    }

    async updateCanonical(
        userId: string,
        agentId: string,
        input: SensitiveWordConfigUpdate,
    ): Promise<SensitiveWordConfig> {
        return this.withLockedAgent(userId, agentId, async (manager, agent) => {
            const currentRevision = getSensitiveWordRevision(agent.sensitiveWordConfig);
            if (input.expectedRevision !== currentRevision) {
                throw HttpErrorFactory.conflict("Sensitive word config revision conflict", {
                    currentRevision,
                });
            }

            const validation = validateSensitiveWordRules(input.rules);
            if (!validation.valid) {
                throw HttpErrorFactory.badRequest("Invalid sensitive word replacement rules", {
                    errors: validation.errors,
                });
            }

            const nextRevision = currentRevision + 1;
            const next = serializeSensitiveWordConfig(
                {
                    enabled: input.enabled,
                    applyToReasoning: input.applyToReasoning,
                    rules: validation.rules,
                },
                nextRevision,
            );
            const current = agent.sensitiveWordConfig;
            if (currentRevision > 0 && this.sameCanonicalPolicy(current, next)) {
                return current;
            }

            await this.writeConfig(manager, agentId, next);
            return next;
        });
    }

    async applyCompatibilityUpdate(
        userId: string,
        agentId: string,
        incoming: unknown,
    ): Promise<SensitiveWordConfig | null> {
        return this.withLockedAgent(userId, agentId, async (manager, agent) => {
            const resolution = resolveSensitiveWordCompatibilityUpdate(
                agent.sensitiveWordConfig,
                incoming,
            );
            if (resolution.action === "conflict") {
                this.throwCompatibilityConflict(resolution.reasonCode);
            }
            if (resolution.action === "ignore") return agent.sensitiveWordConfig ?? null;
            if (resolution.action === "noop") return resolution.config;

            await this.writeConfig(manager, agentId, resolution.config);
            return resolution.config;
        });
    }

    private async withLockedAgent<T>(
        userId: string,
        agentId: string,
        callback: (manager: EntityManager, agent: Agent) => Promise<T>,
    ): Promise<T> {
        return this.dataSource.transaction(async (manager) => {
            const agent = await manager
                .getRepository(Agent)
                .createQueryBuilder("agent")
                .setLock("pessimistic_write")
                .where("agent.id = :agentId", { agentId })
                .getOne();

            if (!agent) throw HttpErrorFactory.notFound("Agent not found");
            if (agent.createBy !== userId) throw HttpErrorFactory.forbidden("Forbidden");
            return callback(manager, agent);
        });
    }

    private sameCanonicalPolicy(
        current: SensitiveWordConfig | null | undefined,
        next: SensitiveWordConfig,
    ): boolean {
        return (
            current?.enabled === next.enabled &&
            (current?.applyToReasoning !== false) === (next.applyToReasoning !== false) &&
            JSON.stringify(current?.rules ?? []) === JSON.stringify(next.rules ?? []) &&
            JSON.stringify(current?.words ?? []) === JSON.stringify(next.words ?? []) &&
            current?.replacement === next.replacement
        );
    }

    private throwCompatibilityConflict(reasonCode: string): never {
        throw HttpErrorFactory.conflict("Sensitive word mapping requires the new editor", {
            reasonCode,
        });
    }

    private async writeConfig(
        manager: EntityManager,
        agentId: string,
        config: SensitiveWordConfig | null,
    ): Promise<void> {
        const metadata = manager.connection.getMetadata(Agent);
        const configColumn = this.requireColumn(metadata, "sensitiveWordConfig");
        const updatedAtColumn = this.requireColumn(metadata, "updatedAt");
        const idColumn = this.requireColumn(metadata, "id");
        const driver = manager.connection.driver;
        const table = metadata.tablePath
            .split(".")
            .map((part) => driver.escape(part))
            .join(".");
        const parameters = [config === null ? null : JSON.stringify(config), new Date(), agentId];
        const placeholders = parameters.map((_, index) => driver.createParameter("value", index));
        const sql =
            `UPDATE ${table} SET ${driver.escape(configColumn.databaseName)} = ${placeholders[0]}, ` +
            `${driver.escape(updatedAtColumn.databaseName)} = ${placeholders[1]} ` +
            `WHERE ${driver.escape(idColumn.databaseName)} = ${placeholders[2]}`;

        await manager.query(sql, parameters);
    }

    private requireColumn(metadata: EntityMetadata, propertyName: string) {
        const column = metadata.findColumnWithPropertyName(propertyName);
        if (!column) throw new Error(`Missing Agent metadata column: ${propertyName}`);
        return column;
    }
}
