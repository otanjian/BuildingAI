import { AgentOpencodeTurn, OPENCODE_TURN_TERMINAL_STATUSES } from "@buildingai/db/entities";
import type { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Inject, Injectable, Optional } from "@nestjs/common";

import type { OpencodeRuntimeEventHubService } from "./opencode-runtime-event-hub.service";
import type { OpencodeTurnReconcilerService } from "./opencode-turn-reconciler.service";

export const OPENCODE_RUNTIME_EVENT_HUB = Symbol("OPENCODE_RUNTIME_EVENT_HUB");
export const OPENCODE_TURN_RECONCILER = Symbol("OPENCODE_TURN_RECONCILER");
export const OPENCODE_TURN_PROJECTION_REFRESH = Symbol("OPENCODE_TURN_PROJECTION_REFRESH");

type ProjectionRefresh = { notify: (turnId: string) => void };

export type OpencodeTurnProjectionEvent = {
    type: "projection";
    id: string;
    data: {
        conversationId: string;
        turnId: string;
        version: string;
        projection: Record<string, unknown>;
        updatedAt: Date | null;
    };
};

export type OpencodeTurnTerminalEvent = {
    type: "terminal";
    id: string;
    data: {
        conversationId: string;
        turnId: string;
        status: "completed" | "cancelled" | "failed";
        assistantMessageId: string;
    };
};

export type OpencodeTurnDisplayEvent = OpencodeTurnProjectionEvent | OpencodeTurnTerminalEvent;

@Injectable()
export class OpencodeTurnEventsService {
    constructor(
        @InjectRepository(AgentOpencodeTurn)
        private readonly turnRepository: Repository<AgentOpencodeTurn>,
        @Inject(OPENCODE_RUNTIME_EVENT_HUB)
        @Optional()
        private readonly runtimeEventHub?: OpencodeRuntimeEventHubService,
        @Inject(OPENCODE_TURN_RECONCILER)
        @Optional()
        private readonly reconciler?: OpencodeTurnReconcilerService,
        @Inject(OPENCODE_TURN_PROJECTION_REFRESH)
        @Optional()
        private readonly projectionRefresh?: ProjectionRefresh,
    ) {}

    async read(input: {
        agentId: string;
        turnId: string;
        userId?: string;
        anonymousIdentifier?: string;
        lastEventId?: string;
    }): Promise<OpencodeTurnDisplayEvent | null> {
        const turn = await this.turnRepository.findOne({
            where: { id: input.turnId },
            relations: { conversation: true },
        });
        if (!turn || turn.conversation.agentId !== input.agentId) {
            throw HttpErrorFactory.notFound("OpenCode turn not found");
        }
        this.assertOwner(turn, input);

        if (OPENCODE_TURN_TERMINAL_STATUSES.includes(turn.status as never)) {
            if (!turn.assistantMessageId) return null;
            return {
                type: "terminal",
                id: `terminal:${turn.projectionVersion}`,
                data: {
                    conversationId: turn.conversationId,
                    turnId: turn.id,
                    status: turn.status as "completed" | "cancelled" | "failed",
                    assistantMessageId: turn.assistantMessageId,
                },
            };
        }

        if (!turn.liveProjection) return null;
        const cursor = this.projectionCursor(input.lastEventId);
        if (BigInt(turn.projectionVersion) <= cursor) return null;
        return {
            type: "projection",
            id: turn.projectionVersion,
            data: {
                conversationId: turn.conversationId,
                turnId: turn.id,
                version: turn.projectionVersion,
                projection: turn.liveProjection,
                updatedAt: turn.projectionUpdatedAt,
            },
        };
    }

    async subscribe(input: {
        agentId: string;
        turnId: string;
        userId?: string;
        anonymousIdentifier?: string;
        onInvalidate: () => void | Promise<void>;
    }): Promise<(() => void) | null> {
        const turn = await this.turnRepository.findOne({
            where: { id: input.turnId },
            relations: { conversation: { agent: true } },
        });
        if (!turn || turn.conversation.agentId !== input.agentId) {
            throw HttpErrorFactory.notFound("OpenCode turn not found");
        }
        this.assertOwner(turn, input);
        if (
            !this.runtimeEventHub ||
            !turn.conversation.opencodeSessionId ||
            OPENCODE_TURN_TERMINAL_STATUSES.includes(turn.status as never)
        ) {
            return null;
        }

        return this.runtimeEventHub.watch({
            config: turn.conversation.agent?.thirdPartyIntegration,
            sessionId: turn.conversation.opencodeSessionId,
            onEvent: async () => {
                this.projectionRefresh?.notify(turn.id);
                await Promise.allSettled([
                    Promise.resolve(input.onInvalidate()),
                    this.reconciler?.tick() ?? Promise.resolve(),
                ]);
            },
        });
    }

    private assertOwner(
        turn: AgentOpencodeTurn,
        input: { userId?: string; anonymousIdentifier?: string },
    ): void {
        if (
            (turn.conversation.userId ?? undefined) !== input.userId ||
            (turn.conversation.anonymousIdentifier ?? undefined) !== input.anonymousIdentifier
        ) {
            throw HttpErrorFactory.forbidden("OpenCode turn access denied");
        }
    }

    private projectionCursor(value?: string): bigint {
        if (!value || value.startsWith("terminal:")) return -1n;
        try {
            return BigInt(value);
        } catch {
            return -1n;
        }
    }
}
