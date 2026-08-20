import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import {
    AgentChatRecord,
    AgentOpencodeTurn,
    OPENCODE_TURN_ACTIVE_STATUSES,
} from "@buildingai/db/entities";
import { DataSource, In, Not, type EntityManager, type QueryRunner } from "@buildingai/db/typeorm";
import { Injectable, Optional } from "@nestjs/common";

import {
    OpencodeApiService,
    type OpencodeSessionMessage,
} from "../integrations/opencode-api.service";
import {
    hashOpencodeRuntime,
    type OpencodeDispatchSnapshot,
    validateOpencodeDispatchSnapshot,
} from "../utils/opencode-turn-command";
import { AgentsService } from "./agents.service";
import { OpencodeArtifactBaselineService } from "./opencode-artifact-baseline.service";
import {
    OpencodeTurnLeaseLostError,
    OpencodeTurnRepository,
} from "./opencode-turn.repository";
import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

const DEFAULT_MUTATION_TIMEOUT_MS = 5_000;
const DEFAULT_AMBIGUITY_WINDOW_MS = 5_000;

type ClaimedTurn = AgentOpencodeTurn & { conversation: AgentChatRecord };

export class OpencodeTurnMutationError extends Error {
    constructor(
        message: string,
        readonly code = "OPENCODE_MUTATION_RETRYABLE",
        readonly retryable = true,
    ) {
        super(message);
        this.name = "OpencodeTurnMutationError";
    }
}

export type OpencodeDispatchResult =
    | { kind: "session-created"; sessionId: string }
    | { kind: "observing"; sessionId: string; message: OpencodeSessionMessage }
    | { kind: "waiting"; sessionId: string; retryAfterMs: number }
    | { kind: "dispatched"; sessionId: string };

@Injectable()
export class OpencodeTurnMutationCoordinator {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly agentsService: AgentsService,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly artifactBaselineService: OpencodeArtifactBaselineService,
        private readonly turnRepository: OpencodeTurnRepository,
        @Optional()
        private readonly telemetry?: OpencodeTurnTelemetryService,
    ) {}

    async dispatch(input: {
        turnId: string;
        leaseToken: string;
        signal?: AbortSignal;
        mutationTimeoutMs?: number;
        ambiguityWindowMs?: number;
        now?: Date;
    }): Promise<OpencodeDispatchResult> {
        return this.withConversationMutationLock(input.turnId, async (queryRunner, initial) => {
            let turn = await this.revalidate(queryRunner.manager, input, initial.conversationId);
            const runtime = await this.resolveRuntime(turn);
            const snapshot = this.snapshot(turn, runtime.workspace);
            let sessionId = turn.conversation.opencodeSessionId;
            this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);

            if (!sessionId) {
                if (turn.status !== "accepted") {
                    throw this.permanentFailure(
                        "OPENCODE_SESSION_LOST",
                        "OpenCode session mapping is lost for an active turn",
                    );
                }
                const priorTurns = await queryRunner.manager.count(AgentOpencodeTurn, {
                    where: {
                        conversationId: turn.conversationId,
                        id: Not(turn.id),
                    },
                });
                if (priorTurns > 0) {
                    throw this.permanentFailure(
                        "OPENCODE_SESSION_LOST",
                        "OpenCode session is lost for a conversation with prior turns",
                    );
                }
                const operationOptions = {
                    signal: input.signal,
                    timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
                };
                const recoveredSessions = await this.opencodeApiService.findSessionsByTurnReceipt({
                    config: turn.conversation.agent?.thirdPartyIntegration,
                    turnId: turn.id,
                    ...operationOptions,
                });
                turn = await this.revalidate(queryRunner.manager, input, turn.conversationId);
                if (turn.conversation.opencodeSessionId) {
                    throw new OpencodeTurnMutationError(
                        "OpenCode session mapping changed during session recovery",
                    );
                }
                const [session, ...duplicateSessions] = recoveredSessions;
                for (const duplicate of duplicateSessions) {
                    await this.opencodeApiService.deleteSession({
                        config: turn.conversation.agent?.thirdPartyIntegration,
                        sessionId: duplicate.id,
                        ...operationOptions,
                    });
                }
                const mappedSession =
                    session ??
                    (await this.opencodeApiService.createSession(
                        turn.conversation.agent?.thirdPartyIntegration,
                        turn.conversation.title,
                        { ...operationOptions, turnReceipt: turn.id },
                    ));
                sessionId = mappedSession.id;
                await queryRunner.startTransaction("READ COMMITTED");
                try {
                    turn = await this.revalidate(queryRunner.manager, input, turn.conversationId);
                    if (turn.conversation.opencodeSessionId) {
                        throw new OpencodeTurnMutationError(
                            "OpenCode session mapping changed during session creation",
                        );
                    }
                    Object.assign(turn.conversation, {
                        opencodeSessionId: sessionId,
                        opencodeRuntimeHash: turn.runtimeConfigHash,
                    });
                    await queryRunner.manager.save(AgentChatRecord, turn.conversation);
                    await queryRunner.commitTransaction();
                } catch (error) {
                    await queryRunner.rollbackTransaction();
                    throw error;
                }
                return { kind: "session-created", sessionId };
            }

            await this.assertMappedSessionExists(turn, sessionId, input);

            const remoteMessage = await this.opencodeApiService.getExactSessionMessage({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                messageId: turn.opencodeUserMessageId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            if (remoteMessage) {
                if (turn.startedAt) {
                    this.telemetry?.increment("recovery_claim", {
                        turnId: turn.id,
                        conversationId: turn.conversationId,
                        recovery: "correlated-remote-message",
                    });
                }
                return { kind: "observing", sessionId, message: remoteMessage };
            }

            const now = input.now ?? new Date();
            const ambiguityWindowMs = input.ambiguityWindowMs ?? DEFAULT_AMBIGUITY_WINDOW_MS;
            if (
                turn.startedAt &&
                now.getTime() - turn.startedAt.getTime() < ambiguityWindowMs
            ) {
                this.telemetry?.increment("dispatch_ambiguity", {
                    turnId: turn.id,
                    conversationId: turn.conversationId,
                    ambiguityAgeMs: now.getTime() - turn.startedAt.getTime(),
                });
                return {
                    kind: "waiting",
                    sessionId,
                    retryAfterMs: ambiguityWindowMs - (now.getTime() - turn.startedAt.getTime()),
                };
            }

            if (!turn.artifactBaseline) {
                const artifactBaseline = await this.artifactBaselineService.capture(
                    snapshot.artifactRoot,
                );
                await queryRunner.startTransaction("READ COMMITTED");
                try {
                    turn = await this.revalidate(queryRunner.manager, input, turn.conversationId);
                    const transitioned = await this.turnRepository.transition(queryRunner.manager, {
                        turnId: turn.id,
                        to: "running",
                        leaseToken: input.leaseToken,
                        patch: {
                            artifactBaseline,
                            startedAt: now,
                            lastActivityAt: now,
                        },
                    });
                    turn = Object.assign(transitioned.turn, { conversation: turn.conversation });
                    await queryRunner.commitTransaction();
                } catch (error) {
                    await queryRunner.rollbackTransaction();
                    throw error;
                }
            }

            await this.revalidate(queryRunner.manager, input, turn.conversationId);
            this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);
            await this.opencodeApiService.promptAsync({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                messageId: turn.opencodeUserMessageId,
                parts: snapshot.promptParts,
                system: snapshot.system,
                model: snapshot.model,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            return { kind: "dispatched", sessionId };
        });
    }

    async replyPermission(input: {
        turnId: string;
        leaseToken: string;
        requestId: string;
        signal?: AbortSignal;
        mutationTimeoutMs?: number;
    }): Promise<boolean> {
        return this.withExactSessionMutation(input, async (turn, sessionId, manager) => {
            const pending = await this.opencodeApiService.listPendingPermissions({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            if (!pending.some((request) => request.id === input.requestId)) return false;
            await this.revalidateActiveClaim(manager, turn, input);
            await this.opencodeApiService.replyPermission({
                config: turn.conversation.agent?.thirdPartyIntegration,
                requestId: input.requestId,
                reply: "always",
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            return true;
        });
    }

    async rejectQuestion(input: {
        turnId: string;
        leaseToken: string;
        requestId: string;
        signal?: AbortSignal;
        mutationTimeoutMs?: number;
    }): Promise<boolean> {
        return this.withExactSessionMutation(input, async (turn, sessionId, manager) => {
            const pending = await this.opencodeApiService.listPendingQuestions({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            if (!pending.some((request) => request.id === input.requestId)) return false;
            await this.revalidateActiveClaim(manager, turn, input);
            await this.opencodeApiService.rejectQuestion({
                config: turn.conversation.agent?.thirdPartyIntegration,
                requestId: input.requestId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
            return true;
        });
    }

    async abort(input: {
        turnId: string;
        leaseToken: string;
        signal?: AbortSignal;
        mutationTimeoutMs?: number;
    }): Promise<void> {
        await this.withExactSessionMutation(input, async (turn, sessionId) => {
            await this.opencodeApiService.abortSession({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
        });
    }

    async assertObservationReady(input: {
        turnId: string;
        leaseToken: string;
        signal?: AbortSignal;
        mutationTimeoutMs?: number;
    }): Promise<void> {
        await this.withConversationMutationLock(input.turnId, async (queryRunner, initial) => {
            const turn = await this.revalidate(
                queryRunner.manager,
                input,
                initial.conversationId,
            );
            const runtime = await this.resolveRuntime(turn);
            this.snapshot(turn, runtime.workspace);
            const sessionId = turn.conversation.opencodeSessionId;
            if (!sessionId) {
                throw this.permanentFailure(
                    "OPENCODE_SESSION_LOST",
                    "OpenCode session mapping is lost for an active turn",
                );
            }
            this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);
            await this.assertMappedSessionExists(turn, sessionId, input);
            await this.revalidateActiveClaim(queryRunner.manager, turn, input);
        });
    }

    private async withExactSessionMutation<T>(
        input: {
            turnId: string;
            leaseToken: string;
            signal?: AbortSignal;
            mutationTimeoutMs?: number;
        },
        operation: (
            turn: ClaimedTurn,
            sessionId: string,
            manager: EntityManager,
        ) => Promise<T>,
    ): Promise<T> {
        return this.withConversationMutationLock(input.turnId, async (queryRunner, initial) => {
            const turn = await this.revalidate(queryRunner.manager, input, initial.conversationId);
            await this.resolveRuntime(turn);
            const sessionId = turn.conversation.opencodeSessionId;
            if (!sessionId) {
                throw new OpencodeTurnMutationError("OpenCode turn has no mapped session");
            }
            this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);
            await this.assertMappedSessionExists(turn, sessionId, input);
            await this.revalidateActiveClaim(queryRunner.manager, turn, input);
            return operation(turn, sessionId, queryRunner.manager);
        });
    }

    private async withConversationMutationLock<T>(
        turnId: string,
        operation: (queryRunner: QueryRunner, initial: ClaimedTurn) => Promise<T>,
    ): Promise<T> {
        const initial = await this.dataSource.getRepository(AgentOpencodeTurn).findOne({
            where: { id: turnId },
            relations: { conversation: true },
        });
        if (!initial) throw new OpencodeTurnMutationError("OpenCode turn not found");

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        const lockKey = `opencode-conversation:${initial.conversationId}`;
        try {
            await queryRunner.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [lockKey]);
            return await operation(queryRunner, initial as ClaimedTurn);
        } finally {
            try {
                await queryRunner.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [
                    lockKey,
                ]);
            } finally {
                await queryRunner.release();
            }
        }
    }

    private async revalidate(
        manager: EntityManager,
        input: { turnId: string; leaseToken: string },
        conversationId: string,
    ): Promise<ClaimedTurn> {
        const turn = await manager.findOne(AgentOpencodeTurn, {
            where: {
                id: input.turnId,
                conversationId,
                status: In([...OPENCODE_TURN_ACTIVE_STATUSES]),
            },
            relations: { conversation: { agent: true } },
        });
        if (!turn || turn.leaseToken !== input.leaseToken) {
            throw new OpencodeTurnLeaseLostError(input.turnId);
        }
        if (!turn.leaseExpiresAt || turn.leaseExpiresAt.getTime() <= Date.now()) {
            throw new OpencodeTurnLeaseLostError(input.turnId);
        }
        return turn as ClaimedTurn;
    }

    private async revalidateActiveClaim(
        manager: EntityManager,
        turn: ClaimedTurn,
        input: { turnId: string; leaseToken: string; mutationTimeoutMs?: number },
    ): Promise<void> {
        const current = await this.revalidate(manager, input, turn.conversationId);
        this.assertDeadlineFitsLease(current, input.mutationTimeoutMs);
    }

    private async assertMappedSessionExists(
        turn: ClaimedTurn,
        sessionId: string,
        input: { signal?: AbortSignal; mutationTimeoutMs?: number },
    ): Promise<void> {
        this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);
        try {
            await this.opencodeApiService.getSessionUpdatedAt({
                config: turn.conversation.agent?.thirdPartyIntegration,
                sessionId,
                signal: input.signal,
                timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
            });
        } catch (error) {
            if ((error as { kind?: string }).kind === "not_found") {
                throw this.permanentFailure(
                    "OPENCODE_SESSION_LOST",
                    "OpenCode mapped session is lost",
                );
            }
            throw error;
        }
    }

    private assertDeadlineFitsLease(turn: ClaimedTurn, timeoutMs?: number): void {
        const operationTimeoutMs = timeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS;
        const remainingLeaseMs = (turn.leaseExpiresAt?.getTime() ?? 0) - Date.now();
        if (operationTimeoutMs >= remainingLeaseMs) {
            throw new OpencodeTurnMutationError(
                "OpenCode operation deadline must be shorter than the remaining turn lease",
            );
        }
    }

    private async resolveRuntime(turn: ClaimedTurn) {
        const agent =
            turn.conversation.agent ??
            (await this.agentsService.getAgentByIdOrThrow(turn.conversation.agentId));
        const runtime = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);
        const runtimeHash = hashOpencodeRuntime(runtime);
        if (runtimeHash !== turn.runtimeConfigHash) {
            throw this.permanentFailure(
                "OPENCODE_RUNTIME_CONFIG_CHANGED",
                "OpenCode runtime binding changed after acceptance",
            );
        }
        const conversationHash = turn.conversation.opencodeRuntimeHash;
        if (conversationHash && conversationHash !== runtimeHash) {
            throw this.permanentFailure(
                "OPENCODE_RUNTIME_CONFIG_CHANGED",
                "OpenCode conversation runtime binding mismatches turn",
            );
        }
        turn.conversation.agent = agent;
        return runtime;
    }

    private snapshot(turn: AgentOpencodeTurn, workspace: string): OpencodeDispatchSnapshot {
        try {
            return validateOpencodeDispatchSnapshot(turn.dispatchSnapshot, workspace);
        } catch {
            throw this.permanentFailure(
                "OPENCODE_SNAPSHOT_INVALID",
                "OpenCode dispatch snapshot is missing or invalid",
            );
        }
    }

    private permanentFailure(code: string, message: string): OpencodeTurnMutationError {
        return new OpencodeTurnMutationError(message, code, false);
    }
}
