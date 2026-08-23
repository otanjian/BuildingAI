import { Cron } from "@buildingai/core/@nestjs/schedule";
import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatRecord, AgentOpencodeTurn } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { OpencodeApiService } from "../integrations/opencode-api.service";
import {
    OPENCODE_IFRAME_BILLING_METADATA_KEY,
    type OpencodeIframeBillingState,
    type OpencodeIframeSettlementPlan,
    planOpencodeIframeSettlements,
    readOpencodeIframeBillingState,
} from "../utils/opencode-iframe-billing";

const ADVISORY_LOCK_KEY = "cron:opencode-iframe-billing:reconcile";

@Injectable()
export class OpencodeIframeBillingReconcilerService {
    private readonly logger = new Logger(OpencodeIframeBillingReconcilerService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly billingHandler: AgentBillingHandler,
        private readonly agentConfigService: AgentConfigService,
    ) {}

    @Cron("*/30 * * * *", {
        name: "opencode-iframe-billing-reconciliation",
        timeZone: "Asia/Shanghai",
    })
    async handleIframeBillingReconciliation(): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            const result = await queryRunner.query(
                "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
                [ADVISORY_LOCK_KEY],
            );
            if (!Boolean(result?.[0]?.locked)) return;

            try {
                await this.reconcileMarkedConversations();
            } finally {
                await queryRunner.query("SELECT pg_advisory_unlock(hashtext($1))", [
                    ADVISORY_LOCK_KEY,
                ]);
            }
        } finally {
            await queryRunner.release();
        }
    }

    private async reconcileMarkedConversations(): Promise<void> {
        const records = await this.chatRecordRepository
            .createQueryBuilder("record")
            .innerJoinAndSelect("record.agent", "agent")
            .where("record.is_deleted = false")
            .andWhere("record.opencode_session_id IS NOT NULL")
            .andWhere("agent.create_mode = :createMode", { createMode: "opencode" })
            .andWhere("record.metadata -> 'opencodeIframeBilling' IS NOT NULL")
            .orderBy("record.updated_at", "ASC")
            .getMany();
        const billingRule = await this.resolveBillingRule();

        for (const record of records) {
            try {
                await this.reconcileConversation(record, billingRule);
            } catch (error) {
                this.logger.warn(
                    `OpenCode iframe billing deferred conversationId=${record.id}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
            }
        }
    }

    private async reconcileConversation(
        record: AgentChatRecord,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<void> {
        const sessionId = record.opencodeSessionId;
        const state = readOpencodeIframeBillingState(
            record.metadata?.[OPENCODE_IFRAME_BILLING_METADATA_KEY],
        );
        if (!sessionId || !state) return;

        const status = await this.opencodeApiService.getSessionStatus({
            config: record.agent?.thirdPartyIntegration,
            sessionId,
        });
        if (status.type !== "idle") return;

        const messages = await this.opencodeApiService.listSessionMessages({
            config: record.agent?.thirdPartyIntegration,
            sessionId,
        });
        const plans = planOpencodeIframeSettlements(messages, state, record.id);
        for (const plan of plans) {
            await this.settlePlan(record, plan, billingRule);
        }
    }

    private async settlePlan(
        record: AgentChatRecord,
        plan: OpencodeIframeSettlementPlan,
        billingRule: { power: number; tokens: number } | undefined,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const locked = await manager.findOne(AgentChatRecord, {
                where: { id: record.id, isDeleted: false },
                lock: { mode: "pessimistic_write" },
            });
            if (!locked) return;

            const state = readOpencodeIframeBillingState(
                locked.metadata?.[OPENCODE_IFRAME_BILLING_METADATA_KEY],
            );
            if (!state || !this.isAfterCursor(plan, state)) return;

            const nativeTurn = await manager.findOne(AgentOpencodeTurn, {
                where: {
                    conversationId: locked.id,
                    opencodeUserMessageId: plan.userMessageId,
                },
            });
            const usage = nativeTurn
                ? { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
                : plan.usage;
            const consumedPower = nativeTurn
                ? 0
                : await this.billingHandler.deduct(
                      {
                          userId: locked.userId!,
                          conversationId: locked.id,
                          agentId: locked.agentId,
                          usage,
                          billingRule,
                          isGuest: Boolean(locked.anonymousIdentifier),
                          associationNo: plan.associationNo,
                      },
                      manager,
                  );
            const nextState: OpencodeIframeBillingState = {
                ...state,
                lastSettledUserMessageId: plan.userMessageId,
                lastSettledUserMessageCreatedAt: plan.userMessageCreatedAt,
                lastActivityAt: new Date(plan.lastActivityAt).toISOString(),
                lastSettledAt: new Date().toISOString(),
                inputTokens: state.inputTokens + Number(usage.inputTokens ?? 0),
                outputTokens: state.outputTokens + Number(usage.outputTokens ?? 0),
                totalTokens: state.totalTokens + Number(usage.totalTokens ?? 0),
                consumedPower: state.consumedPower + consumedPower,
                settledTurns: state.settledTurns + (nativeTurn ? 0 : 1),
            };

            await manager.update(
                AgentChatRecord,
                { id: locked.id },
                {
                    totalTokens: Number(locked.totalTokens ?? 0) + Number(usage.totalTokens ?? 0),
                    consumedPower: Number(locked.consumedPower ?? 0) + consumedPower,
                    metadata: {
                        ...(locked.metadata ?? {}),
                        [OPENCODE_IFRAME_BILLING_METADATA_KEY]: nextState,
                    } as any,
                },
            );
        });
    }

    private isAfterCursor(
        plan: OpencodeIframeSettlementPlan,
        state: OpencodeIframeBillingState,
    ): boolean {
        if (!state.lastSettledUserMessageId) return true;
        const cursorCreatedAt = state.lastSettledUserMessageCreatedAt;
        if (typeof cursorCreatedAt !== "number") {
            return plan.userMessageId !== state.lastSettledUserMessageId;
        }
        if (plan.userMessageCreatedAt !== cursorCreatedAt) {
            return plan.userMessageCreatedAt > cursorCreatedAt;
        }
        return plan.userMessageId > state.lastSettledUserMessageId;
    }

    private async resolveBillingRule(): Promise<{ power: number; tokens: number } | undefined> {
        const config = await this.agentConfigService.getConfig();
        const item = config.createTypes.find((candidate) => candidate.key === "opencode");
        if (
            item?.enabled !== true ||
            item.billingMode !== "points" ||
            Number(item.points ?? 0) <= 0
        ) {
            return undefined;
        }
        return { power: Number(item.points), tokens: 1000 };
    }
}
