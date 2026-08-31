import type { Agent } from "@buildingai/db/entities";
import { Injectable, Logger } from "@nestjs/common";
import { generateId } from "ai";

import { OpencodeApiService } from "../integrations/opencode-api.service";
import { shouldAbortStuckSession } from "../utils/opencode-permission";
import {
    findHealableCompletedAssistant,
    isOpencodeSessionStuck,
    isPlaceholderAssistantText,
    type OpencodeSessionMessageLike,
} from "../utils/opencode-session-stuck";
import { mergeOpencodeTurnMetadata } from "../utils/opencode-turn-status";
import { AgentChatMessageService } from "./agent-chat-message.service";
import { AgentChatRecordService } from "./agent-chat-record.service";
import { OpencodeTurnRunnerService } from "./opencode-turn-runner.service";

export type OpencodeRecoverResult = {
    abortedStuck: boolean;
    healed: boolean;
    healedOpencodeMessageId?: string;
};

/**
 * Abort hung OpenCode sessions and thin-heal Bowi AI when OC finished ahead.
 */
@Injectable()
export class OpencodeSessionRecoverService {
    private readonly logger = new Logger(OpencodeSessionRecoverService.name);

    constructor(
        private readonly opencodeApiService: OpencodeApiService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentChatMessageService: AgentChatMessageService,
        private readonly turnRunner: OpencodeTurnRunnerService,
    ) {}

    async recoverConversation(params: {
        agent: Agent;
        conversationId: string;
        userId?: string;
        anonymousIdentifier?: string;
    }): Promise<OpencodeRecoverResult> {
        const result: OpencodeRecoverResult = { abortedStuck: false, healed: false };
        const record = await this.agentChatRecordService.getConversation(params.conversationId);
        if (!record) return result;

        const metadata = (record.metadata ?? {}) as Record<string, unknown>;
        const sessionId =
            typeof metadata.opencodeSessionId === "string" ? metadata.opencodeSessionId : undefined;
        if (!sessionId) return result;

        // Live runner owns the session — do not abort under it.
        // Still flush permission asks: headless serve has no TUI, and a missed
        // SSE event would leave the in-flight turn hung forever.
        if (this.turnRunner.isRunning(params.conversationId)) {
            await this.opencodeApiService.approvePendingPermissions({
                config: params.agent.thirdPartyIntegration,
                sessionId,
            });
            return result;
        }

        let ocMessages: OpencodeSessionMessageLike[] = [];
        try {
            ocMessages = await this.opencodeApiService.listSessionMessages({
                config: params.agent.thirdPartyIntegration,
                sessionId,
            });
        } catch (error) {
            this.logger.warn(
                `OpenCode list messages failed for ${sessionId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            return result;
        }

        const pendingCount = await this.opencodeApiService.approvePendingPermissions({
            config: params.agent.thirdPartyIntegration,
            sessionId,
        });
        if (
            shouldAbortStuckSession({
                isStuck: isOpencodeSessionStuck(ocMessages),
                pendingPermissionCount: pendingCount,
            })
        ) {
            await this.opencodeApiService.abortSession({
                config: params.agent.thirdPartyIntegration,
                sessionId,
            });
            result.abortedStuck = true;
            // Refresh after abort for heal inspection
            try {
                ocMessages = await this.opencodeApiService.listSessionMessages({
                    config: params.agent.thirdPartyIntegration,
                    sessionId,
                });
            } catch {
                // keep previous
            }
        }

        const alreadyHealed =
            typeof metadata.lastHealedOpencodeMessageId === "string"
                ? metadata.lastHealedOpencodeMessageId
                : undefined;
        const healable = findHealableCompletedAssistant(ocMessages, alreadyHealed);
        if (healable) {
            const baMessages = await this.agentChatMessageService.getConversationMessages(
                params.conversationId,
            );
            const lastBa = baMessages[baMessages.length - 1];
            const lastRole = (lastBa?.message as { role?: string } | undefined)?.role;
            const lastText = extractBaText(lastBa?.message);
            const needsHeal =
                !lastBa ||
                lastRole === "user" ||
                (lastRole === "assistant" && isPlaceholderAssistantText(lastText));

            if (needsHeal) {
                if (lastRole === "assistant" && lastBa && isPlaceholderAssistantText(lastText)) {
                    await this.agentChatMessageService.updateMessage(lastBa.id, {
                        message: {
                            id: (lastBa.message as { id?: string })?.id ?? generateId(),
                            role: "assistant",
                            parts: [{ type: "text", text: healable.text }],
                        } as any,
                        status: "completed",
                    });
                } else {
                    await this.agentChatMessageService.createMessage({
                        conversationId: params.conversationId,
                        agentId: params.agent.id,
                        userId: params.userId ?? record.userId ?? undefined,
                        anonymousIdentifier:
                            params.anonymousIdentifier ?? record.anonymousIdentifier ?? undefined,
                        message: {
                            id: generateId(),
                            role: "assistant",
                            parts: [{ type: "text", text: healable.text }],
                        } as any,
                        parentId: lastRole === "user" ? lastBa?.id : undefined,
                    });
                }
                result.healed = true;
                result.healedOpencodeMessageId = healable.info.id;
                await this.agentChatRecordService.updateStats(params.conversationId);
            }
        }

        const at = new Date().toISOString();
        const nextStatus = result.healed
            ? "recovered"
            : result.abortedStuck
              ? "aborted"
              : undefined;
        const metaPatch: Record<string, unknown> = {};
        if (nextStatus) {
            Object.assign(
                metaPatch,
                mergeOpencodeTurnMetadata(metadata, { status: nextStatus, at }),
            );
        } else if (metadata.opencodeTurnStatus === "running" && pendingCount === 0) {
            // Stale running with no live runner and no permission wait
            Object.assign(
                metaPatch,
                mergeOpencodeTurnMetadata(metadata, { status: "aborted", at }),
            );
        }
        if (result.healedOpencodeMessageId) {
            metaPatch.lastHealedOpencodeMessageId = result.healedOpencodeMessageId;
        }
        if (Object.keys(metaPatch).length > 0) {
            await this.agentChatRecordService.updateMetadata(params.conversationId, metaPatch);
        }

        return result;
    }
}

function extractBaText(message: unknown): string {
    if (!message || typeof message !== "object") return "";
    const parts = (message as { parts?: Array<{ type?: string; text?: string }> }).parts;
    if (!Array.isArray(parts)) return "";
    return parts
        .filter((p) => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("\n");
}
