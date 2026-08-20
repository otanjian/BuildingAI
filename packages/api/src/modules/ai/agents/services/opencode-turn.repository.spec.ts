jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPOSITORY_PATH = resolve(__dirname, "opencode-turn.repository.ts");
const STATUSES = [
    "accepted",
    "running",
    "committing",
    "completed",
    "cancelled",
    "failed",
] as const;

const ALLOWED_EDGES = new Set([
    "accepted:running",
    "accepted:committing",
    "accepted:failed",
    "running:committing",
    "running:failed",
    "committing:completed",
    "committing:cancelled",
    "committing:failed",
]);

function loadRepositoryModule(): Record<string, any> | undefined {
    expect(existsSync(REPOSITORY_PATH)).toBe(true);
    if (!existsSync(REPOSITORY_PATH)) return undefined;
    return require(REPOSITORY_PATH) as Record<string, any>;
}

function makeTurn(status: (typeof STATUSES)[number], overrides: Record<string, unknown> = {}) {
    return {
        id: "11111111-1111-4111-8111-111111111111",
        status,
        dispatchSnapshot: { prompt: "redacted" },
        artifactBaseline: status === "accepted" ? null : { files: [] },
        assistantMessageId: null,
        completedAt: null,
        leaseToken: "22222222-2222-4222-8222-222222222222",
        leaseExpiresAt: new Date("2026-08-21T01:00:00.000Z"),
        ...overrides,
    };
}

function terminalPatch() {
    return {
        assistantMessageId: "33333333-3333-4333-8333-333333333333",
        completedAt: new Date("2026-08-21T00:30:00.000Z"),
        dispatchSnapshot: null,
        artifactBaseline: null,
        leaseToken: null,
        leaseExpiresAt: null,
        cancelRequestedAt: null,
    };
}

function transitionPatch(to: string) {
    if (to === "running" || to === "committing") {
        return { artifactBaseline: { files: [] } };
    }
    if (["completed", "cancelled", "failed"].includes(to)) {
        return terminalPatch();
    }
    return {};
}

function makeManager(turn: Record<string, any>) {
    return {
        findOne: jest.fn(async () => turn),
        save: jest.fn(async (_target: unknown, entity: unknown) => entity),
    };
}

describe("OpencodeTurnRepository state machine", () => {
    it.each(
        STATUSES.flatMap((from) => STATUSES.map((to) => [from, to] as const)),
    )("enforces transition %s -> %s", async (from, to) => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager(makeTurn(from));
        const repository = new module.OpencodeTurnRepository();
        const action = repository.transition(manager, {
            turnId: "11111111-1111-4111-8111-111111111111",
            to,
            patch: transitionPatch(to),
        });

        if (from === to) {
            await expect(action).resolves.toMatchObject({ changed: false, turn: { status: from } });
            expect(manager.save).not.toHaveBeenCalled();
            return;
        }

        if (ALLOWED_EDGES.has(`${from}:${to}`)) {
            await expect(action).resolves.toMatchObject({ changed: true, turn: { status: to } });
            expect(manager.save).toHaveBeenCalledTimes(1);
            return;
        }

        await expect(action).rejects.toBeInstanceOf(module.OpencodeTurnTransitionError);
        expect(manager.save).not.toHaveBeenCalled();
    });

    it("locks the exact row before changing state", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager(makeTurn("accepted"));
        const repository = new module.OpencodeTurnRepository();
        await repository.transition(manager, {
            turnId: "11111111-1111-4111-8111-111111111111",
            to: "running",
            patch: { artifactBaseline: { files: [] } },
        });

        expect(manager.findOne).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                where: { id: "11111111-1111-4111-8111-111111111111" },
                lock: { mode: "pessimistic_write" },
            }),
        );
        expect(manager.findOne.mock.invocationCallOrder[0]).toBeLessThan(
            manager.save.mock.invocationCallOrder[0],
        );
    });

    it("moves a pre-dispatch cancellation into committing without inventing a baseline", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const cancelRequestedAt = new Date("2026-08-21T00:05:00.000Z");
        const manager = makeManager(
            makeTurn("accepted", {
                artifactBaseline: null,
                cancelRequestedAt,
                startedAt: null,
            }),
        );
        const repository = new module.OpencodeTurnRepository();

        await expect(
            repository.transition(manager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "committing",
            }),
        ).resolves.toMatchObject({
            changed: true,
            turn: { status: "committing", artifactBaseline: null, cancelRequestedAt },
        });
    });

    it("rejects a missing turn", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager(null as any);
        const repository = new module.OpencodeTurnRepository();
        await expect(
            repository.transition(manager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "running",
                patch: { artifactBaseline: { files: [] } },
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnNotFoundError);
    });

    it("fences a stale lease token before any save", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager(makeTurn("running"));
        const repository = new module.OpencodeTurnRepository();
        await expect(
            repository.transition(manager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "committing",
                leaseToken: "44444444-4444-4444-8444-444444444444",
                patch: { artifactBaseline: { files: [] } },
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnLeaseLostError);
        expect(manager.save).not.toHaveBeenCalled();
    });

    it("rejects incomplete active and terminal transition patches before save", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const repository = new module.OpencodeTurnRepository();
        const activeManager = makeManager(makeTurn("accepted"));
        await expect(
            repository.transition(activeManager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "running",
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnInvariantError);

        const terminalManager = makeManager(makeTurn("committing"));
        await expect(
            repository.transition(terminalManager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "completed",
                patch: { completedAt: new Date() },
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnInvariantError);
    });
});
