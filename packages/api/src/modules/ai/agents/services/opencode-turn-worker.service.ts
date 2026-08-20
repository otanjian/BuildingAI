import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { AgentOpencodeTurn } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import {
    OpencodeApiService,
    type OpencodeSessionMessage,
    type OpencodeSessionStatus,
} from "../integrations/opencode-api.service";
import { OpencodeArtifactBaselineService, type OpencodeArtifactBaseline } from "./opencode-artifact-baseline.service";
import {
    decideOpencodeTurnObservation,
    type OpencodeTurnEvidence,
} from "./opencode-turn-observer";
import { buildOpencodeTurnProjection } from "./opencode-turn-projection";
import { OpencodeTurnMutationCoordinator } from "./opencode-turn-mutation-coordinator";
import { OpencodeTurnRepository } from "./opencode-turn.repository";
import { OpencodeTurnTerminalCommitService } from "./opencode-turn-terminal-commit";

const DEFAULT_READ_TIMEOUT_MS = 5_000;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_GRACE_MS = 1_000;

@Injectable()
export class OpencodeTurnWorkerService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly mutationCoordinator: OpencodeTurnMutationCoordinator,
        private readonly artifactBaselineService: OpencodeArtifactBaselineService,
        private readonly terminalCommitService: OpencodeTurnTerminalCommitService,
        private readonly turnRepository: OpencodeTurnRepository,
    ) {}

    async runStep(input: {
        turnId: string;
        leaseToken: string;
        signal?: AbortSignal;
        readTimeoutMs?: number;
        inactivityTimeoutMs?: number;
        retryGraceMs?: number;
    }): Promise<Record<string, unknown>> {
        const turn = await this.loadClaim(input);
        if (turn.status === "accepted" && turn.cancelRequestedAt && !turn.startedAt) {
            await this.dataSource.transaction((manager) =>
                this.turnRepository.transition(manager, {
                    turnId: turn.id,
                    to: "committing",
                    leaseToken: input.leaseToken,
                }),
            );
            return this.commitCancellation(turn, input, "Turn cancelled before dispatch");
        }
        if (turn.status === "accepted") {
            const dispatched = await this.mutationCoordinator.dispatch({
                turnId: turn.id,
                leaseToken: input.leaseToken,
                signal: input.signal,
            });
            return { action: dispatched.kind, ...dispatched };
        }

        const sessionId = turn.conversation.opencodeSessionId;
        if (!sessionId) throw new Error("Active OpenCode turn has no mapped session");
        const config = turn.conversation.agent?.thirdPartyIntegration;
        const timeoutMs = input.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
        const remoteStatus = await this.opencodeApiService.getSessionStatus({
            config,
            sessionId,
            signal: input.signal,
            timeoutMs,
        });
        const sessionUpdatedAt = await this.opencodeApiService.getSessionUpdatedAt({
            config,
            sessionId,
            signal: input.signal,
            timeoutMs,
        });
        const exactUser = await this.opencodeApiService.getExactSessionMessage({
            config,
            sessionId,
            messageId: turn.opencodeUserMessageId,
            signal: input.signal,
            timeoutMs,
        });
        const [permissions, questions] = await Promise.all([
            this.opencodeApiService.listPendingPermissions({
                config,
                sessionId,
                signal: input.signal,
                timeoutMs,
            }),
            this.opencodeApiService.listPendingQuestions({
                config,
                sessionId,
                signal: input.signal,
                timeoutMs,
            }),
        ]);

        let recentMessages: OpencodeSessionMessage[] = [];
        if (remoteStatus.type === "idle" || turn.status === "committing") {
            recentMessages = await this.opencodeApiService.listRecentSessionMessages({
                config,
                sessionId,
                limit: 50,
                signal: input.signal,
                timeoutMs,
            });
        }
        const descendants = recentMessages.filter(
            (message) =>
                message.info?.role === "assistant" &&
                message.info.parentID === turn.opencodeUserMessageId,
        );
        const exactTerminalDescendantsVisible = descendants.some(
            (message) => Boolean(message.info?.finish) && !message.info?.error,
        );
        const exactDescendantErrorVisible = descendants.some((message) =>
            Boolean(message.info?.error),
        );
        if (
            remoteStatus.type === "idle" &&
            descendants.length === 0 &&
            (turn.cancelRequestedAt ||
                turn.errorCode === "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED" ||
                turn.errorCode === "OPENCODE_INACTIVITY_TIMEOUT")
        ) {
            return this.commitControlFallback(turn, input);
        }
        const currentEvidence = this.evidence({
            remoteStatus,
            sessionUpdatedAt,
            exactUser,
            descendants,
            permissionIds: permissions.map((item) => item.id),
            questionIds: questions.map((item) => item.id),
        });
        const currentEvidenceHash = this.hashEvidence(currentEvidence);
        const activityChanged = turn.remoteEvidenceHash !== currentEvidenceHash;
        const decision = decideOpencodeTurnObservation({
            localStatus: turn.status as "running" | "committing",
            remoteStatus,
            previousEvidence: activityChanged ? null : currentEvidence,
            currentEvidence,
            lastActivityAt: turn.lastActivityAt.getTime(),
            now: Date.now(),
            inactivityTimeoutMs: input.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS,
            retryGraceMs: input.retryGraceMs ?? DEFAULT_RETRY_GRACE_MS,
            finalEvidenceCheck: turn.errorCode === "OPENCODE_FINAL_EVIDENCE_CHECK",
            exactTerminalDescendantsVisible,
            exactDescendantErrorVisible,
            pendingPermissionIds: permissions.map((item) => item.id),
            pendingQuestionIds: questions.map((item) => item.id),
            cancelRequested: Boolean(turn.cancelRequestedAt),
        });

        const preserveControlIntent =
            turn.errorCode !== "OPENCODE_FINAL_EVIDENCE_CHECK" && Boolean(turn.errorCode);
        if (
            decision.activityChanged &&
            decision.kind !== "reply-permission" &&
            decision.kind !== "reject-question"
        ) {
            await this.recordEvidence(
                turn,
                input.leaseToken,
                currentEvidenceHash,
                preserveControlIntent ? turn.errorCode : null,
                preserveControlIntent ? turn.errorMessage : null,
            );
        }

        switch (decision.kind) {
            case "reply-permission":
                await this.mutationCoordinator.replyPermission({
                    turnId: turn.id,
                    leaseToken: input.leaseToken,
                    requestId: decision.requestId,
                    signal: input.signal,
                });
                await this.recordEvidence(
                    turn,
                    input.leaseToken,
                    currentEvidenceHash,
                    preserveControlIntent ? turn.errorCode : null,
                    preserveControlIntent ? turn.errorMessage : null,
                );
                return { action: decision.kind, activityChanged: true };
            case "reject-question":
                await this.mutationCoordinator.rejectQuestion({
                    turnId: turn.id,
                    leaseToken: input.leaseToken,
                    requestId: decision.requestId,
                    signal: input.signal,
                });
                await this.recordEvidence(
                    turn,
                    input.leaseToken,
                    currentEvidenceHash,
                    decision.errorCode,
                    "OpenCode interactive questions are unsupported",
                );
                await this.mutationCoordinator.abort({
                    turnId: turn.id,
                    leaseToken: input.leaseToken,
                    signal: input.signal,
                });
                return { action: decision.kind, activityChanged: true };
            case "abort-cancelled":
                await this.mutationCoordinator.abort({
                    turnId: turn.id,
                    leaseToken: input.leaseToken,
                    signal: input.signal,
                });
                return { action: decision.kind, activityChanged: true };
            case "final-check":
                await this.recordEvidence(
                    turn,
                    input.leaseToken,
                    currentEvidenceHash,
                    "OPENCODE_FINAL_EVIDENCE_CHECK",
                    null,
                );
                return { action: decision.kind, activityChanged: false };
            case "abort-stale":
                await this.mutationCoordinator.abort({
                    turnId: turn.id,
                    leaseToken: input.leaseToken,
                    signal: input.signal,
                });
                await this.recordEvidence(
                    turn,
                    input.leaseToken,
                    currentEvidenceHash,
                    decision.errorCode,
                    "OpenCode turn timed out after no changed remote evidence",
                );
                return { action: decision.kind, activityChanged: false };
            case "committing":
                await this.dataSource.transaction((manager) =>
                    this.turnRepository.transition(manager, {
                        turnId: turn.id,
                        to: "committing",
                        leaseToken: input.leaseToken,
                        patch: { lastActivityAt: new Date(), remoteEvidenceHash: currentEvidenceHash },
                    }),
                );
                return { action: decision.kind, activityChanged: decision.activityChanged };
            case "settle":
                return this.settle(
                    turn,
                    input,
                    descendants,
                    turn.cancelRequestedAt
                        ? "cancelled"
                        : turn.errorCode === "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED"
                          ? "failed"
                          : decision.outcome,
                );
            case "continue":
                return {
                    action: decision.kind,
                    activityChanged: decision.activityChanged,
                    retryAfterMs: decision.retryAfterMs,
                };
        }
    }

    private async settle(
        turn: AgentOpencodeTurn,
        input: { leaseToken: string },
        descendants: OpencodeSessionMessage[],
        outcome: "completed" | "cancelled" | "failed",
    ) {
        const projection = buildOpencodeTurnProjection({
            remoteUserMessageId: turn.opencodeUserMessageId,
            messages: descendants,
            sensitiveWordConfig: turn.conversation.agent?.sensitiveWordConfig,
        });
        const snapshot = turn.dispatchSnapshot as { artifactRoot: string };
        const changedHtml = await this.artifactBaselineService.changedHtmlFiles(
            snapshot.artifactRoot,
            turn.artifactBaseline as unknown as OpencodeArtifactBaseline,
        );
        const artifacts = changedHtml.map((relativePath) => ({
            kind: "html",
            title: path.basename(relativePath),
            relativePath,
            url: `/api/ai-agents/${turn.conversation.agentId}/conversations/${turn.conversationId}/artifacts/${relativePath}`,
        }));
        const result = await this.terminalCommitService.commit({
            turnId: turn.id,
            leaseToken: input.leaseToken,
            assistantMessageId: randomUUID(),
            outcome: projection.error ? "failed" : outcome,
            parts: projection.parts,
            usage: projection.usage,
            artifacts,
            errorCode: projection.error?.code,
            errorMessage: projection.error?.message,
        });
        return { action: "settled", ...result };
    }

    private async commitCancellation(
        turn: AgentOpencodeTurn,
        input: { leaseToken: string },
        message: string,
    ) {
        const result = await this.terminalCommitService.commit({
            turnId: turn.id,
            leaseToken: input.leaseToken,
            assistantMessageId: randomUUID(),
            outcome: "cancelled",
            parts: [{ type: "text", text: message }],
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            errorCode: "OPENCODE_CANCELLED",
            errorMessage: message,
        });
        return { action: "settled", ...result };
    }

    private async commitControlFallback(
        turn: AgentOpencodeTurn,
        input: { leaseToken: string },
    ) {
        const cancelled = Boolean(turn.cancelRequestedAt);
        const message = cancelled
            ? "Turn cancelled by user"
            : turn.errorMessage || "OpenCode turn failed";
        const result = await this.terminalCommitService.commit({
            turnId: turn.id,
            leaseToken: input.leaseToken,
            assistantMessageId: randomUUID(),
            outcome: cancelled ? "cancelled" : "failed",
            parts: [{ type: "text", text: message }],
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            errorCode: cancelled ? "OPENCODE_CANCELLED" : turn.errorCode ?? "OPENCODE_FAILED",
            errorMessage: message,
        });
        return { action: "settled", ...result };
    }

    private async loadClaim(input: { turnId: string; leaseToken: string }) {
        const turn = await this.dataSource.manager.findOne(AgentOpencodeTurn, {
            where: { id: input.turnId },
            relations: { conversation: { agent: true } },
        });
        if (!turn || turn.leaseToken !== input.leaseToken) {
            throw new Error("OpenCode worker lost its turn lease");
        }
        return turn;
    }

    private async recordEvidence(
        turn: AgentOpencodeTurn,
        leaseToken: string,
        remoteEvidenceHash: string,
        errorCode: string | null,
        errorMessage: string | null,
    ) {
        await this.dataSource.transaction((manager) =>
            this.turnRepository.recordActiveEvidence(manager, {
                turnId: turn.id,
                leaseToken,
                lastActivityAt: new Date(),
                remoteEvidenceHash,
                errorCode,
                errorMessage,
            }),
        );
    }

    private evidence(input: {
        remoteStatus: OpencodeSessionStatus;
        sessionUpdatedAt: number;
        exactUser: OpencodeSessionMessage | null;
        descendants: OpencodeSessionMessage[];
        permissionIds: string[];
        questionIds: string[];
    }): OpencodeTurnEvidence {
        return {
            statusKey:
                input.remoteStatus.type === "retry"
                    ? `retry:${input.remoteStatus.attempt}:${input.remoteStatus.next}`
                    : input.remoteStatus.type,
            sessionUpdatedAt: input.sessionUpdatedAt,
            messageFingerprint: [
                input.exactUser?.info?.id ?? "missing",
                ...input.descendants.map((message) =>
                    [
                        message.info?.id ?? "",
                        message.info?.finish ?? "",
                        message.info?.error ? "error" : "",
                        message.parts?.length ?? 0,
                    ].join(":"),
                ),
            ].join("|"),
            interactionFingerprint: [
                ...input.permissionIds.map((id) => `permission:${id}`),
                ...input.questionIds.map((id) => `question:${id}`),
            ]
                .sort()
                .join("|"),
        };
    }

    private hashEvidence(evidence: OpencodeTurnEvidence): string {
        return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
    }
}
