import { Injectable } from "@nestjs/common";

export type OpencodeTurnHandle = {
    conversationId: string;
    cancel: () => void;
    readonly signal: AbortSignal;
    readonly done: Promise<void>;
};

type RegistryEntry = {
    conversationId: string;
    controller: AbortController;
    resolveDone: () => void;
    done: Promise<void>;
};

/**
 * In-process registry for OpenCode turns that outlive a single HTTP response.
 */
@Injectable()
export class OpencodeTurnRunnerService {
    private readonly turns = new Map<string, RegistryEntry>();
    /** Retain detached turn promises so they are not GC'd while in flight. */
    private readonly backgroundTurns = new Set<Promise<unknown>>();

    isRunning(conversationId: string): boolean {
        return this.turns.has(conversationId);
    }

    /**
     * Start a turn. Throws if one is already active for this conversation.
     */
    start(conversationId: string): OpencodeTurnHandle {
        if (this.turns.has(conversationId)) {
            throw new Error(`OpenCode turn already running for conversation ${conversationId}`);
        }
        const controller = new AbortController();
        let resolveDone!: () => void;
        const done = new Promise<void>((resolve) => {
            resolveDone = resolve;
        });
        const entry: RegistryEntry = { conversationId, controller, resolveDone, done };
        this.turns.set(conversationId, entry);
        return {
            conversationId,
            signal: controller.signal,
            done,
            cancel: () => this.cancel(conversationId),
        };
    }

    cancel(conversationId: string): boolean {
        const entry = this.turns.get(conversationId);
        if (!entry) return false;
        if (!entry.controller.signal.aborted) {
            entry.controller.abort();
        }
        return true;
    }

    /**
     * Mark the turn finished and remove it from the registry.
     */
    complete(conversationId: string): void {
        const entry = this.turns.get(conversationId);
        if (!entry) return;
        this.turns.delete(conversationId);
        entry.resolveDone();
    }

    /**
     * Keep a detached turn promise referenced until it settles.
     */
    keepAlive<T>(promise: Promise<T>): Promise<T> {
        this.backgroundTurns.add(promise);
        void promise.finally(() => {
            this.backgroundTurns.delete(promise);
        });
        return promise;
    }

    getSignal(conversationId: string): AbortSignal | undefined {
        return this.turns.get(conversationId)?.controller.signal;
    }
}
