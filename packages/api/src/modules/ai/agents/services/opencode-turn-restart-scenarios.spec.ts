jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("./opencode-turn-worker.service", () => ({
    OpencodeTurnWorkerService: class OpencodeTurnWorkerService {},
}));

import { OpencodeTurnReconcilerService } from "./opencode-turn-reconciler.service";

describe("durable OpenCode restart scenarios", () => {
    it.each(["accepted", "running", "committing"])(
        "claims and resumes a %s turn after its prior process lease expires",
        async (status) => {
            const manager = {};
            const claim = {
                id: `turn-${status}`,
                status,
                leaseToken: `lease-${status}`,
                leaseExpiresAt: new Date(Date.now() + 30_000),
            };
            const dataSource = {
                manager,
                transaction: jest.fn(async (callback: any) => callback(manager)),
            };
            const leases = {
                claimAvailable: jest.fn(async () => [claim]),
                renew: jest.fn(async () => claim.leaseExpiresAt),
                release: jest.fn(async () => undefined),
            };
            const worker = { runStep: jest.fn(async () => ({ action: "continue" })) };
            const service = new OpencodeTurnReconcilerService(
                dataSource as any,
                leases as any,
                worker as any,
                { capacity: 1, leaseDurationMs: 30_000, intervalMs: 1_000 },
            );

            await service.tick();

            expect(leases.claimAvailable).toHaveBeenCalledWith(
                manager,
                expect.objectContaining({ limit: 1, leaseDurationMs: 30_000 }),
            );
            expect(worker.runStep).toHaveBeenCalledWith({
                turnId: `turn-${status}`,
                leaseToken: `lease-${status}`,
                signal: expect.any(AbortSignal),
            });
            expect(leases.release).toHaveBeenCalledWith(manager, {
                turnId: `turn-${status}`,
                leaseToken: `lease-${status}`,
            });
        },
    );

    it("runs two different-conversation claims in parallel while preserving per-turn ownership", async () => {
        const manager = {};
        const claims = [
            { id: "turn-a", leaseToken: "lease-a" },
            { id: "turn-b", leaseToken: "lease-b" },
        ];
        const dataSource = {
            manager,
            transaction: jest.fn(async (callback: any) => callback(manager)),
        };
        const leases = {
            claimAvailable: jest.fn(async () => claims),
            renew: jest.fn(),
            release: jest.fn(async () => undefined),
        };
        const releases: Array<() => void> = [];
        const worker = {
            runStep: jest.fn(
                (_input: { turnId: string; leaseToken: string; signal: AbortSignal }) =>
                    new Promise<void>((resolve) => releases.push(resolve)),
            ),
        };
        const service = new OpencodeTurnReconcilerService(
            dataSource as any,
            leases as any,
            worker as any,
            { capacity: 2, leaseDurationMs: 30_000, intervalMs: 1_000 },
        );

        const tick = service.tick();
        await new Promise((resolve) => setImmediate(resolve));
        expect(worker.runStep).toHaveBeenCalledTimes(2);
        expect(worker.runStep.mock.calls.map(([input]) => input)).toEqual([
            expect.objectContaining({ turnId: "turn-a", leaseToken: "lease-a" }),
            expect.objectContaining({ turnId: "turn-b", leaseToken: "lease-b" }),
        ]);
        releases.forEach((release) => release());
        await tick;
    });
});
