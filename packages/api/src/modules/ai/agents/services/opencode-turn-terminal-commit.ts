import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import {
    AgentChatMessage,
    AgentOpencodeTurn,
    OPENCODE_TURN_TERMINAL_STATUSES,
    type OpencodeTurnStatus,
} from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import type { ChatMessageUsage, ChatUIMessage } from "@buildingai/types";
import { Injectable, Optional } from "@nestjs/common";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { AgentChatRecordService } from "./agent-chat-record.service";
import { OpencodeTurnRepository } from "./opencode-turn.repository";
import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

type TerminalOutcome = Extract<OpencodeTurnStatus, "completed" | "cancelled" | "failed">;

export type OpencodeTurnTerminalCommitInput = {
    turnId: string;
    leaseToken: string;
    assistantMessageId: string;
    outcome: TerminalOutcome;
    parts: Array<Record<string, unknown>>;
    usage: ChatMessageUsage;
    artifacts?: Array<Record<string, unknown>>;
    errorCode?: string;
    errorMessage?: string;
    completedAt?: Date;
};

export type OpencodeTurnTerminalCommitResult = {
    status: TerminalOutcome;
    assistantMessageId: string;
    duplicate: boolean;
};

@Injectable()
export class OpencodeTurnTerminalCommitService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly billingHandler: AgentBillingHandler,
        private readonly chatRecordService: AgentChatRecordService,
        private readonly turnRepository: OpencodeTurnRepository,
        @Optional()
        private readonly telemetry?: OpencodeTurnTelemetryService,
    ) {}

    async commit(
        input: OpencodeTurnTerminalCommitInput,
    ): Promise<OpencodeTurnTerminalCommitResult> {
        try {
            return await this.commitTransaction(input);
        } catch (error) {
            if (!this.isInsufficientBalance(error)) {
                this.telemetry?.increment("commit_retry", {
                    turnId: input.turnId,
                    outcome: input.outcome,
                    errorKind: error instanceof Error ? error.name : "unknown",
                });
                throw error;
            }
            return this.commitTransaction({
                ...input,
                outcome: "failed",
                parts: [],
                artifacts: [],
                errorCode: "OPENCODE_BILLING_INSUFFICIENT",
                errorMessage: "积分不足，OpenCode 已完成但结果未展示，请充值后重新发起。",
                forceFree: true,
            });
        }
    }

    private async commitTransaction(
        input: OpencodeTurnTerminalCommitInput & { forceFree?: boolean },
    ): Promise<OpencodeTurnTerminalCommitResult> {
        return this.dataSource.transaction(async (manager) => {
            const turn = await this.turnRepository.findLocked(manager, input.turnId);
            if (OPENCODE_TURN_TERMINAL_STATUSES.includes(turn.status as any)) {
                await this.turnRepository.getTerminalNoop(
                    manager,
                    turn.id,
                    turn.status as TerminalOutcome,
                );
                return {
                    status: turn.status as TerminalOutcome,
                    assistantMessageId: turn.assistantMessageId!,
                    duplicate: true,
                };
            }
            if (turn.status !== "committing" || turn.leaseToken !== input.leaseToken) {
                throw new Error("OpenCode terminal commit requires the current committing lease");
            }

            const snapshot = turn.dispatchSnapshot as {
                billing?: { enabled?: boolean; power?: number; tokens?: number };
            } | null;
            if (!snapshot) throw new Error("OpenCode terminal commit snapshot is missing");

            const parts = this.visibleParts(input);
            let userConsumedPower = 0;
            if (!input.forceFree && snapshot.billing?.enabled && turn.conversation.userId) {
                userConsumedPower = await this.billingHandler.deduct(
                    {
                        userId: turn.conversation.userId,
                        conversationId: turn.conversationId,
                        agentId: turn.conversation.agentId,
                        usage: input.usage,
                        billingRule: {
                            power: Number(snapshot.billing.power ?? 0),
                            tokens: Number(snapshot.billing.tokens ?? 0),
                        },
                        isGuest: Boolean(turn.conversation.anonymousIdentifier),
                        associationNo: `opencode-turn:${turn.id}`,
                    },
                    manager,
                );
            }

            const message: ChatUIMessage = {
                id: input.assistantMessageId,
                role: "assistant",
                parts: parts as ChatUIMessage["parts"],
                usage: input.usage,
                userConsumedPower,
            };
            await manager.save(
                AgentChatMessage,
                manager.create(AgentChatMessage, {
                    id: input.assistantMessageId,
                    conversationId: turn.conversationId,
                    agentId: turn.conversation.agentId,
                    userId: turn.conversation.userId,
                    anonymousIdentifier: turn.conversation.anonymousIdentifier,
                    parentId: turn.inputMessageId,
                    message,
                    status: input.outcome === "failed" ? "failed" : "completed",
                    rawResponse: {
                        provider: "opencode",
                        turnId: turn.id,
                        errorCode: input.errorCode,
                    },
                }),
            );

            await this.chatRecordService.updateStats(turn.conversationId, manager);
            await this.turnRepository.transition(manager, {
                turnId: turn.id,
                to: input.outcome,
                leaseToken: input.leaseToken,
                patch: {
                    assistantMessageId: input.assistantMessageId,
                    completedAt: input.completedAt ?? new Date(),
                    errorCode: input.errorCode ?? null,
                    errorMessage: input.errorMessage ?? null,
                    lastActivityAt: input.completedAt ?? new Date(),
                },
            });
            return {
                status: input.outcome,
                assistantMessageId: input.assistantMessageId,
                duplicate: false,
            };
        });
    }

    private isInsufficientBalance(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return /(?:余额|积分).*不足|insufficient.*(?:balance|power|point)/i.test(message);
    }

    private visibleParts(input: OpencodeTurnTerminalCommitInput): Array<Record<string, unknown>> {
        const parts = [...input.parts];
        for (const artifact of input.artifacts ?? []) {
            parts.push({ type: "data-artifact", data: artifact });
        }
        const visible = parts.some((part) => {
            if (part.type === "text" || part.type === "reasoning") {
                return typeof part.text === "string" && part.text.trim().length > 0;
            }
            return part.type === "dynamic-tool" || part.type === "data-artifact";
        });
        if (!visible && input.outcome !== "completed" && input.errorMessage?.trim()) {
            parts.push({ type: "text", text: input.errorMessage.trim() });
            return parts;
        }
        if (!visible) {
            throw new Error("OpenCode terminal outcome requires a non-blank assistant projection");
        }
        return parts;
    }
}
