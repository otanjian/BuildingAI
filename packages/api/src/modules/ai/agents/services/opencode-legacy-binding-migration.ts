import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatMessage, AgentChatRecord } from "@buildingai/db/entities";
import { DataSource, In, type Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger } from "@nestjs/common";

import { OpencodeApiService } from "../integrations/opencode-api.service";
import { hashOpencodeRuntime } from "../utils/opencode-turn-command";

export type LegacyOpencodeMessageLink = {
    id: string;
    parentId: string | null;
};

export type LegacyOpencodeMappingIssue = "branched" | "duplicate" | "unverifiable";

export type LegacyOpencodeMappingCandidate = {
    conversationId: string;
    sessionId: string | null;
    runtimeHash: string | null;
    sessionVerified: boolean;
    verificationError?: string;
    messages: LegacyOpencodeMessageLink[];
};

export type LegacyOpencodeMappingReportItem = LegacyOpencodeMappingCandidate & {
    eligible: boolean;
    issues: LegacyOpencodeMappingIssue[];
};

function classifyMessageChain(
    messages: LegacyOpencodeMessageLink[],
): "linear" | "branched" | "unverifiable" {
    if (messages.length === 0) return "unverifiable";
    const ids = new Set(messages.map((message) => message.id));
    if (ids.size !== messages.length) return "unverifiable";

    const roots = messages.filter((message) => !message.parentId);
    if (roots.length !== 1) return "unverifiable";
    const childByParent = new Map<string, string>();
    for (const message of messages) {
        if (!message.parentId) continue;
        if (!ids.has(message.parentId)) return "unverifiable";
        if (childByParent.has(message.parentId)) return "branched";
        childByParent.set(message.parentId, message.id);
    }

    const visited = new Set<string>();
    let cursor: string | undefined = roots[0].id;
    while (cursor) {
        if (visited.has(cursor)) return "unverifiable";
        visited.add(cursor);
        cursor = childByParent.get(cursor);
    }
    return visited.size === messages.length ? "linear" : "unverifiable";
}

export function classifyLegacyOpencodeMappings(
    candidates: LegacyOpencodeMappingCandidate[],
): LegacyOpencodeMappingReportItem[] {
    const bindingCounts = new Map<string, number>();
    for (const candidate of candidates) {
        if (!candidate.sessionId || !candidate.runtimeHash) continue;
        const key = `${candidate.runtimeHash}\u0000${candidate.sessionId}`;
        bindingCounts.set(key, (bindingCounts.get(key) ?? 0) + 1);
    }

    return candidates.map((candidate) => {
        const issues: LegacyOpencodeMappingIssue[] = [];
        const chain = classifyMessageChain(candidate.messages);
        if (chain === "branched") issues.push("branched");
        else if (chain === "unverifiable") issues.push("unverifiable");

        if (!candidate.sessionId || !candidate.runtimeHash || !candidate.sessionVerified) {
            if (!issues.includes("unverifiable")) issues.push("unverifiable");
        } else if (
            (bindingCounts.get(`${candidate.runtimeHash}\u0000${candidate.sessionId}`) ?? 0) > 1
        ) {
            issues.push("duplicate");
        }

        return { ...candidate, eligible: issues.length === 0, issues };
    });
}

export type LegacyOpencodeMappingApplyResult = {
    migratedConversationIds: string[];
    skippedConversationIds: string[];
};

/**
 * Operator-invoked compatibility migration. It never guesses a runtime binding:
 * planning first verifies the legacy session against the agent's current runtime,
 * and applying uses metadata plus uniqueness guards in one transaction.
 */
@Injectable()
export class OpencodeLegacyBindingMigrationService {
    private readonly logger = new Logger(OpencodeLegacyBindingMigrationService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AgentChatMessage)
        private readonly messageRepository: Repository<AgentChatMessage>,
        private readonly opencodeApiService: OpencodeApiService,
    ) {}

    async plan(): Promise<LegacyOpencodeMappingReportItem[]> {
        const records = await this.chatRecordRepository
            .createQueryBuilder("record")
            .leftJoinAndSelect("record.agent", "agent")
            .where("record.opencodeSessionId IS NULL")
            .andWhere("record.opencodeRuntimeHash IS NULL")
            .andWhere("NULLIF(BTRIM(record.metadata ->> 'opencodeSessionId'), '') IS NOT NULL")
            .orderBy("record.createdAt", "ASC")
            .getMany();
        if (!records.length) return [];

        const messages = await this.messageRepository.find({
            where: { conversationId: In(records.map((record) => record.id)) },
            select: { id: true, conversationId: true, parentId: true },
            order: { createdAt: "ASC" },
        });
        const messagesByConversation = new Map<string, LegacyOpencodeMessageLink[]>();
        for (const message of messages) {
            const list = messagesByConversation.get(message.conversationId) ?? [];
            list.push({ id: message.id, parentId: message.parentId ?? null });
            messagesByConversation.set(message.conversationId, list);
        }

        const candidates: LegacyOpencodeMappingCandidate[] = [];
        for (const record of records) {
            const sessionId = this.readSessionId(record.metadata);
            let runtimeHash: string | null = null;
            let sessionVerified = false;
            let verificationError: string | undefined;
            try {
                if (record.agent?.createMode !== "opencode") {
                    throw new Error("conversation agent is not an OpenCode agent");
                }
                const runtime = this.opencodeApiService.normalizeConfig(
                    record.agent.thirdPartyIntegration,
                );
                runtimeHash = hashOpencodeRuntime(runtime);
                if (!sessionId) throw new Error("legacy metadata has no OpenCode session ID");
                await this.opencodeApiService.getSessionUpdatedAt({
                    config: record.agent.thirdPartyIntegration,
                    sessionId,
                    timeoutMs: 5_000,
                });
                sessionVerified = true;
            } catch (error) {
                verificationError = error instanceof Error ? error.message : String(error);
            }
            candidates.push({
                conversationId: record.id,
                sessionId,
                runtimeHash,
                sessionVerified,
                verificationError,
                messages: messagesByConversation.get(record.id) ?? [],
            });
        }

        const report = classifyLegacyOpencodeMappings(candidates);
        this.logger.log(
            JSON.stringify({
                event: "opencode.legacy-binding.plan",
                total: report.length,
                eligible: report.filter((item) => item.eligible).length,
                branched: report.filter((item) => item.issues.includes("branched")).length,
                duplicate: report.filter((item) => item.issues.includes("duplicate")).length,
                unverifiable: report.filter((item) => item.issues.includes("unverifiable")).length,
            }),
        );
        return report;
    }

    async applyVerified(
        report: LegacyOpencodeMappingReportItem[],
    ): Promise<LegacyOpencodeMappingApplyResult> {
        const eligible = report.filter(
            (item) => item.eligible && item.sessionId && item.runtimeHash,
        );
        const skippedConversationIds = report
            .filter((item) => !eligible.includes(item))
            .map((item) => item.conversationId);
        const migratedConversationIds: string[] = [];
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        await runner.startTransaction("READ COMMITTED");
        try {
            for (const item of eligible) {
                const rows = await runner.query(
                    `UPDATE "ai_agent_chat_record" AS record
                     SET "opencode_session_id" = $2,
                         "opencode_runtime_hash" = $3,
                         "updated_at" = now()
                     WHERE record."id" = $1
                       AND record."opencode_session_id" IS NULL
                       AND record."opencode_runtime_hash" IS NULL
                       AND record."metadata" ->> 'opencodeSessionId' = $2
                       AND NOT EXISTS (
                           SELECT 1
                           FROM "ai_agent_chat_record" AS existing
                           WHERE existing."opencode_session_id" = $2
                             AND existing."opencode_runtime_hash" = $3
                             AND existing."id" <> $1
                       )
                     RETURNING record."id"`,
                    [item.conversationId, item.sessionId, item.runtimeHash],
                );
                if (rows.length === 1) migratedConversationIds.push(item.conversationId);
                else skippedConversationIds.push(item.conversationId);
            }
            await runner.commitTransaction();
        } catch (error) {
            await runner.rollbackTransaction();
            throw error;
        } finally {
            await runner.release();
        }
        this.logger.log(
            JSON.stringify({
                event: "opencode.legacy-binding.apply",
                migrated: migratedConversationIds.length,
                skipped: skippedConversationIds.length,
            }),
        );
        return { migratedConversationIds, skippedConversationIds };
    }

    private readSessionId(metadata: Record<string, unknown> | undefined): string | null {
        const value = metadata?.opencodeSessionId;
        return typeof value === "string" && value.trim() ? value.trim() : null;
    }
}
