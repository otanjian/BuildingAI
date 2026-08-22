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
        remoteEvidenceHash: status === "accepted" ? null : "evidence-hash",
        liveProjection: status === "accepted" ? null : { status: "running", parts: [] },
        projectionVersion: status === "accepted" ? "0" : "3",
        projectionUpdatedAt: status === "accepted" ? null : new Date(),
        ...overrides,
    };
}

function terminalPatch() {
    return {
        assistantMessageId: "33333333-3333-4333-8333-333333333333",
        completedAt: new Date("2026-08-21T00:30:00.000Z"),
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

        const initialTurn = makeTurn(from);
        if (["completed", "cancelled", "failed"].includes(from)) {
            Object.assign(initialTurn, terminalPatch(), {
                artifactBaseline: null,
                cancelRequestedAt: null,
                dispatchSnapshot: null,
                leaseExpiresAt: null,
                leaseToken: null,
                remoteEvidenceHash: null,
                liveProjection: null,
                projectionUpdatedAt: null,
            });
        }
        const manager = makeManager(initialTurn);
        const repository = new module.OpencodeTurnRepository();

        if (from === to) {
            if (["completed", "cancelled", "failed"].includes(from)) {
                await expect(
                    repository.getTerminalNoop(manager, initialTurn.id, from),
                ).resolves.toEqual({ changed: false, turn: initialTurn });
                expect(manager.save).not.toHaveBeenCalled();
                return;
            }
            const action = repository.transition(manager, {
                turnId: initialTurn.id,
                to,
                leaseToken: "22222222-2222-4222-8222-222222222222",
                patch: transitionPatch(to),
            });
            await expect(action).resolves.toMatchObject({ changed: false, turn: { status: from } });
            expect(manager.save).not.toHaveBeenCalled();
            return;
        }

        const action = repository.transition(manager, {
            turnId: initialTurn.id,
            to,
            leaseToken: "22222222-2222-4222-8222-222222222222",
            patch: transitionPatch(to),
        });

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
            leaseToken: "22222222-2222-4222-8222-222222222222",
            patch: { artifactBaseline: { files: [] } },
        });

        expect(manager.findOne).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                where: { id: "11111111-1111-4111-8111-111111111111" },
                lock: {
                    mode: "pessimistic_write",
                    tables: ["ai_agent_opencode_turn"],
                },
                relations: { conversation: true },
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
                leaseToken: "22222222-2222-4222-8222-222222222222",
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
                leaseToken: "22222222-2222-4222-8222-222222222222",
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
                leaseToken: "22222222-2222-4222-8222-222222222222",
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnInvariantError);

        const terminalManager = makeManager(makeTurn("committing"));
        await expect(
            repository.transition(terminalManager, {
                turnId: "11111111-1111-4111-8111-111111111111",
                to: "completed",
                leaseToken: "22222222-2222-4222-8222-222222222222",
                patch: { completedAt: new Date() },
            }),
        ).rejects.toBeInstanceOf(module.OpencodeTurnInvariantError);
    });

    it("does not allow transition patches to overwrite identity or lease ownership", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager(makeTurn("accepted"));
        const repository = new module.OpencodeTurnRepository();
        await repository.transition(manager, {
            turnId: "11111111-1111-4111-8111-111111111111",
            to: "running",
            leaseToken: "22222222-2222-4222-8222-222222222222",
            patch: {
                artifactBaseline: { files: [] },
                dispatchSnapshot: { prompt: "tampered" },
                id: "99999999-9999-4999-8999-999999999999",
                leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            } as any,
        });

        expect(manager.save).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "11111111-1111-4111-8111-111111111111",
                dispatchSnapshot: { prompt: "redacted" },
                leaseToken: "22222222-2222-4222-8222-222222222222",
            }),
        );
    });

    it("records changed active evidence only with the exact lease token", async () => {
        const module = loadRepositoryModule();
        if (!module) return;
        const turn = makeTurn("running");
        const manager = makeManager(turn);
        const repository = new module.OpencodeTurnRepository();
        const at = new Date("2026-08-21T00:20:00.000Z");

        await expect(
            repository.recordActiveEvidence(manager, {
                turnId: turn.id,
                leaseToken: turn.leaseToken,
                lastActivityAt: at,
                errorCode: "RECOVERY_INTENT",
                errorMessage: "visible later",
                remoteEvidenceHash: "next-hash",
            }),
        ).resolves.toMatchObject({ lastActivityAt: at, errorCode: "RECOVERY_INTENT" });
        expect(manager.save).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                lastActivityAt: at,
                errorCode: "RECOVERY_INTENT",
                errorMessage: "visible later",
                remoteEvidenceHash: "next-hash",
            }),
        );
    });

    it.each([
        ["stale lease", makeTurn("running"), "wrong-token"],
        ["terminal", makeTurn("completed", { ...terminalPatch(), leaseToken: null }), null],
    ])("rejects active evidence from a %s worker", async (_case, turn, leaseToken) => {
        const module = loadRepositoryModule();
        if (!module) return;
        const manager = makeManager(turn);
        await expect(
            new module.OpencodeTurnRepository().recordActiveEvidence(manager, {
                turnId: turn.id,
                leaseToken,
                lastActivityAt: new Date(),
            }),
        ).rejects.toThrow(/lease|active/i);
        expect(manager.save).not.toHaveBeenCalled();
    });

    it("provides a separate terminal no-op path without worker lease ownership", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const terminal = makeTurn("completed", {
            ...terminalPatch(),
            artifactBaseline: null,
            cancelRequestedAt: null,
            dispatchSnapshot: null,
            leaseExpiresAt: null,
            leaseToken: null,
            liveProjection: null,
            projectionUpdatedAt: null,
        });
        const manager = makeManager(terminal);
        const repository = new module.OpencodeTurnRepository();
        await expect(
            repository.getTerminalNoop(
                manager,
                "11111111-1111-4111-8111-111111111111",
                "completed",
            ),
        ).resolves.toEqual({ changed: false, turn: terminal });
        expect(manager.save).not.toHaveBeenCalled();
    });
});
