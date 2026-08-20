import {
    AgentOpencodeTurn,
    OPENCODE_TURN_ACTIVE_STATUSES,
    OPENCODE_TURN_TERMINAL_STATUSES,
    type OpencodeTurnStatus,
} from "@buildingai/db/entities/ai-agent-opencode-turn.entity";
import type { EntityManager } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

const ALLOWED_TRANSITIONS: Readonly<Record<OpencodeTurnStatus, readonly OpencodeTurnStatus[]>> = {
    accepted: ["running", "committing", "failed"],
    running: ["committing", "failed"],
    committing: ["completed", "cancelled", "failed"],
    completed: [],
    cancelled: [],
    failed: [],
};

const TRANSITION_PATCH_FIELDS = [
    "artifactBaseline",
    "assistantMessageId",
    "completedAt",
    "errorCode",
    "errorMessage",
    "lastActivityAt",
    "startedAt",
] as const satisfies readonly (keyof OpencodeTurnTransitionPatch)[];

export class OpencodeTurnNotFoundError extends Error {
    constructor(turnId: string) {
        super(`OpenCode turn not found: ${turnId}`);
        this.name = "OpencodeTurnNotFoundError";
    }
}

export class OpencodeTurnTransitionError extends Error {
    constructor(from: OpencodeTurnStatus, to: OpencodeTurnStatus) {
        super(`OpenCode turn transition is not allowed: ${from} -> ${to}`);
        this.name = "OpencodeTurnTransitionError";
    }
}

export class OpencodeTurnLeaseLostError extends Error {
    constructor(turnId: string) {
        super(`OpenCode turn lease is no longer owned: ${turnId}`);
        this.name = "OpencodeTurnLeaseLostError";
    }
}

export class OpencodeTurnInvariantError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OpencodeTurnInvariantError";
    }
}

export type OpencodeTurnTransitionResult = {
    changed: boolean;
    turn: AgentOpencodeTurn;
};

export type OpencodeTurnTransitionInput = {
    turnId: string;
    to: OpencodeTurnStatus;
    leaseToken: string;
    patch?: OpencodeTurnTransitionPatch;
};

export type OpencodeTurnTransitionPatch = Partial<
    Pick<
        AgentOpencodeTurn,
        | "artifactBaseline"
        | "assistantMessageId"
        | "completedAt"
        | "errorCode"
        | "errorMessage"
        | "lastActivityAt"
        | "startedAt"
    >
>;

@Injectable()
export class OpencodeTurnRepository {
    async findLocked(
        manager: EntityManager,
        turnId: string,
    ): Promise<AgentOpencodeTurn> {
        const turn = await manager.findOne(AgentOpencodeTurn, {
            where: { id: turnId },
            lock: { mode: "pessimistic_write" },
        });
        if (!turn) {
            throw new OpencodeTurnNotFoundError(turnId);
        }
        return turn;
    }

    async transition(
        manager: EntityManager,
        input: OpencodeTurnTransitionInput,
    ): Promise<OpencodeTurnTransitionResult> {
        const turn = await this.findLocked(manager, input.turnId);

        if (turn.status === input.to) {
            this.assertLease(turn, input.leaseToken);
            return { changed: false, turn };
        }
        if (!ALLOWED_TRANSITIONS[turn.status].includes(input.to)) {
            throw new OpencodeTurnTransitionError(turn.status, input.to);
        }
        this.assertLease(turn, input.leaseToken);

        const next = Object.assign(turn, this.pickPatch(input.patch), { status: input.to });
        if (OPENCODE_TURN_TERMINAL_STATUSES.includes(input.to as any)) {
            Object.assign(next, {
                artifactBaseline: null,
                cancelRequestedAt: null,
                dispatchSnapshot: null,
                leaseToken: null,
                leaseExpiresAt: null,
            });
        }
        this.assertInvariants(next);
        const saved = await manager.save(AgentOpencodeTurn, next);
        return { changed: true, turn: saved };
    }

    async getTerminalNoop(
        manager: EntityManager,
        turnId: string,
        expected: Extract<OpencodeTurnStatus, "completed" | "cancelled" | "failed">,
    ): Promise<OpencodeTurnTransitionResult> {
        const turn = await this.findLocked(manager, turnId);
        if (turn.status !== expected || !OPENCODE_TURN_TERMINAL_STATUSES.includes(turn.status)) {
            throw new OpencodeTurnTransitionError(turn.status, expected);
        }
        return { changed: false, turn };
    }

    private assertLease(turn: AgentOpencodeTurn, expected: string): void {
        if (turn.leaseToken !== expected) {
            throw new OpencodeTurnLeaseLostError(turn.id);
        }
    }

    private pickPatch(
        patch: OpencodeTurnTransitionPatch | undefined,
    ): OpencodeTurnTransitionPatch {
        if (!patch) return {};
        const safePatch: OpencodeTurnTransitionPatch = {};
        for (const field of TRANSITION_PATCH_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(patch, field)) {
                (safePatch as Record<string, unknown>)[field] = patch[field];
            }
        }
        return safePatch;
    }

    private assertInvariants(turn: AgentOpencodeTurn): void {
        if (turn.status === "running" && turn.artifactBaseline === null) {
            throw new OpencodeTurnInvariantError(
                "Running OpenCode turn requires an artifact baseline",
            );
        }
        if (
            turn.status === "committing" &&
            turn.artifactBaseline === null &&
            !(turn.cancelRequestedAt && turn.startedAt === null)
        ) {
            throw new OpencodeTurnInvariantError(
                "Committing OpenCode turn requires remote dispatch or pre-dispatch cancellation evidence",
            );
        }

        if (OPENCODE_TURN_ACTIVE_STATUSES.includes(turn.status as any)) {
            if (
                turn.dispatchSnapshot === null ||
                turn.assistantMessageId !== null ||
                turn.completedAt !== null
            ) {
                throw new OpencodeTurnInvariantError(
                    "Active OpenCode turn has invalid snapshot or terminal fields",
                );
            }
            return;
        }

        if (OPENCODE_TURN_TERMINAL_STATUSES.includes(turn.status as any)) {
            if (
                !turn.assistantMessageId ||
                !turn.completedAt ||
                turn.dispatchSnapshot !== null ||
                turn.artifactBaseline !== null ||
                turn.leaseToken !== null ||
                turn.leaseExpiresAt !== null ||
                turn.cancelRequestedAt !== null
            ) {
                throw new OpencodeTurnInvariantError(
                    "Terminal OpenCode turn requires one projection and cleared recovery state",
                );
            }
        }
    }
}
