jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("./opencode-turn-lease.repository", () => ({
    OpencodeTurnLeaseRepository: class OpencodeTurnLeaseRepository {},
}));
jest.mock("./opencode-turn-worker.service", () => ({
    OpencodeTurnWorkerService: class OpencodeTurnWorkerService {},
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_PATH = resolve(__dirname, "opencode-turn-reconciler.service.ts");

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(SERVICE_PATH)).toBe(true);
    if (!existsSync(SERVICE_PATH)) return undefined;
    return require(SERVICE_PATH) as Record<string, any>;
}

function makeHarness(claims: Array<Record<string, any>> = []) {
    const manager = {};
    const dataSource = {
        transaction: jest.fn(async (callback: any) => callback(manager)),
    };
    const leaseRepository = {
        claimAvailable: jest.fn(async () => claims),
        renew: jest.fn(async () => new Date(Date.now() + 30_000)),
        release: jest.fn(async () => undefined),
    };
    const worker = {
        runStep: jest.fn(async (_input?: any) => ({ action: "continue" })),
    };
    return { manager, dataSource, leaseRepository, worker };
}

describe("OpencodeTurnReconcilerService", () => {
    it("claims only free local capacity and leaves excess turns unclaimed", async () => {
        const module = loadModule();
        if (!module) return;
        const claims = [
            { id: "turn-1", leaseToken: "token-1" },
            { id: "turn-2", leaseToken: "token-2" },
        ];
        const harness = makeHarness(claims);
        const releases: Array<() => void> = [];
        harness.worker.runStep.mockImplementation(
            () =>
                new Promise((resolve) =>
                    releases.push(() => resolve({ action: "continue" })),
                ),
        );
        const service = new module.OpencodeTurnReconcilerService(
            harness.dataSource,
            harness.leaseRepository,
            harness.worker,
            { capacity: 2, leaseDurationMs: 30_000, intervalMs: 1_000 },
        );

        const firstTick = service.tick();
        await new Promise((resolve) => setImmediate(resolve));
        await service.tick();
        expect(harness.leaseRepository.claimAvailable).toHaveBeenCalledTimes(1);
        expect(harness.leaseRepository.claimAvailable).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({ limit: 2 }),
        );
        releases.forEach((release) => release());
        await firstTick;
    });

    it("releases an active claim after one bounded worker step", async () => {
        const module = loadModule();
        if (!module) return;
        const claim = { id: "turn-1", leaseToken: "token-1" };
        const harness = makeHarness([claim]);
        const service = new module.OpencodeTurnReconcilerService(
            harness.dataSource,
            harness.leaseRepository,
            harness.worker,
            { capacity: 1, leaseDurationMs: 30_000, intervalMs: 1_000 },
        );

        await service.tick();
        expect(harness.worker.runStep).toHaveBeenCalledWith({
            turnId: "turn-1",
            leaseToken: "token-1",
            signal: expect.any(AbortSignal),
        });
        expect(harness.leaseRepository.release).toHaveBeenCalledWith(harness.manager, {
            turnId: "turn-1",
            leaseToken: "token-1",
        });
    });

    it("does not overlap reconciler ticks", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness([]);
        let releaseClaim!: () => void;
        harness.leaseRepository.claimAvailable.mockImplementation(
            () => new Promise((resolve) => (releaseClaim = () => resolve([]))),
        );
        const service = new module.OpencodeTurnReconcilerService(
            harness.dataSource,
            harness.leaseRepository,
            harness.worker,
            { capacity: 1, leaseDurationMs: 30_000, intervalMs: 1_000 },
        );

        const first = service.tick();
        await Promise.resolve();
        await service.tick();
        expect(harness.leaseRepository.claimAvailable).toHaveBeenCalledTimes(1);
        releaseClaim();
        await first;
    });

    it("renews an in-flight lease before half its duration elapses", async () => {
        jest.useFakeTimers();
        try {
            const module = loadModule();
            if (!module) return;
            const harness = makeHarness([{ id: "turn-1", leaseToken: "token-1" }]);
            let finish!: () => void;
            harness.worker.runStep.mockImplementation(
                () => new Promise((resolve) => (finish = () => resolve({ action: "continue" }))),
            );
            const service = new module.OpencodeTurnReconcilerService(
                harness.dataSource,
                harness.leaseRepository,
                harness.worker,
                { capacity: 1, leaseDurationMs: 30_000, intervalMs: 1_000 },
            );

            const tick = service.tick();
            await Promise.resolve();
            await jest.advanceTimersByTimeAsync(15_000);
            expect(harness.leaseRepository.renew).toHaveBeenCalledWith(
                harness.manager,
                expect.objectContaining({
                    turnId: "turn-1",
                    leaseToken: "token-1",
                    leaseDurationMs: 30_000,
                }),
            );
            finish();
            await tick;
        } finally {
            jest.useRealTimers();
        }
    });

    it("aborts in-flight steps and waits for graceful shutdown", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness([{ id: "turn-1", leaseToken: "token-1" }]);
        let observedSignal: AbortSignal | undefined;
        harness.worker.runStep.mockImplementation(async ({ signal }) => {
            observedSignal = signal;
            await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
            return { action: "stopped" };
        });
        const service = new module.OpencodeTurnReconcilerService(
            harness.dataSource,
            harness.leaseRepository,
            harness.worker,
            { capacity: 1, leaseDurationMs: 30_000, intervalMs: 1_000 },
        );

        const tick = service.tick();
        await new Promise((resolve) => setImmediate(resolve));
        expect(observedSignal).toBeDefined();
        await service.onModuleDestroy();
        await tick;
        expect(observedSignal?.aborted).toBe(true);
    });
});
