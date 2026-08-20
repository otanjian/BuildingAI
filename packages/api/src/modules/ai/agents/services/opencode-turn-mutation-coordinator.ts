import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import {
    AgentChatRecord,
    AgentOpencodeTurn,
    OPENCODE_TURN_ACTIVE_STATUSES,
} from "@buildingai/db/entities";
import { DataSource, In, Not, type EntityManager, type QueryRunner } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import {
    OpencodeApiService,
    type OpencodeSessionMessage,
} from "../integrations/opencode-api.service";
import { hashOpencodeRuntime } from "../utils/opencode-turn-command";
import { AgentsService } from "./agents.service";
import { OpencodeArtifactBaselineService } from "./opencode-artifact-baseline.service";
import {
    OpencodeTurnLeaseLostError,
    OpencodeTurnRepository,
} from "./opencode-turn.repository";

const DEFAULT_MUTATION_TIMEOUT_MS = 5_000;
const DEFAULT_AMBIGUITY_WINDOW_MS = 5_000;

type FrozenDispatchSnapshot = {
    promptParts: Array<Record<string, unknown>>;
    system: string;
    model?: { providerID: string; modelID: string };
    artifactRoot: string;
};

type ClaimedTurn = AgentOpencodeTurn & { conversation: AgentChatRecord };

export class OpencodeTurnMutationError extends Error {
    constructor(message: string) {
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
            const snapshot = this.snapshot(turn);
            let sessionId = turn.conversation.opencodeSessionId;
            this.assertDeadlineFitsLease(turn, input.mutationTimeoutMs);

            if (!sessionId) {
                const priorTurns = await queryRunner.manager.count(AgentOpencodeTurn, {
                    where: {
                        conversationId: turn.conversationId,
                        id: Not(turn.id),
                    },
                });
                if (priorTurns > 0) {
                    throw new OpencodeTurnMutationError(
                        "OpenCode session is lost for a conversation with prior turns",
                    );
                }
                const session = await this.opencodeApiService.createSession(
                    turn.conversation.agent?.thirdPartyIntegration,
                    turn.conversation.title,
                    {
                        signal: input.signal,
                        timeoutMs: input.mutationTimeoutMs ?? DEFAULT_MUTATION_TIMEOUT_MS,
                    },
                );
                sessionId = session.id;
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
                return { kind: "observing", sessionId, message: remoteMessage };
            }

            const now = input.now ?? new Date();
            const ambiguityWindowMs = input.ambiguityWindowMs ?? DEFAULT_AMBIGUITY_WINDOW_MS;
            if (
                turn.startedAt &&
                now.getTime() - turn.startedAt.getTime() < ambiguityWindowMs
            ) {
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
                throw new OpencodeTurnMutationError("OpenCode mapped session is lost");
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
            throw new OpencodeTurnMutationError("OpenCode runtime binding changed after acceptance");
        }
        const conversationHash = turn.conversation.opencodeRuntimeHash;
        if (conversationHash && conversationHash !== runtimeHash) {
            throw new OpencodeTurnMutationError("OpenCode conversation runtime binding mismatches turn");
        }
        turn.conversation.agent = agent;
        return runtime;
    }

    private snapshot(turn: AgentOpencodeTurn): FrozenDispatchSnapshot {
        const snapshot = turn.dispatchSnapshot;
        if (!snapshot || !Array.isArray(snapshot.promptParts)) {
            throw new OpencodeTurnMutationError("OpenCode dispatch snapshot is missing or invalid");
        }
        if (typeof snapshot.system !== "string" || typeof snapshot.artifactRoot !== "string") {
            throw new OpencodeTurnMutationError("OpenCode dispatch snapshot fields are invalid");
        }
        return snapshot as FrozenDispatchSnapshot;
    }
}
