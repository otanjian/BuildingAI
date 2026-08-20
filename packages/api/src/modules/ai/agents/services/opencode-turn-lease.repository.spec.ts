jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPOSITORY_PATH = resolve(__dirname, "opencode-turn-lease.repository.ts");
const NOW = new Date("2026-08-21T00:00:00.000Z");

function loadRepositoryModule(): Record<string, any> | undefined {
    expect(existsSync(REPOSITORY_PATH)).toBe(true);
    if (!existsSync(REPOSITORY_PATH)) return undefined;
    return require(REPOSITORY_PATH) as Record<string, any>;
}

function makeQueryBuilder(rows: Array<Record<string, any>>) {
    const builder: Record<string, jest.Mock> = {};
    for (const name of [
        "where",
        "andWhere",
        "orderBy",
        "addOrderBy",
        "setLock",
        "setOnLocked",
        "take",
    ]) {
        builder[name] = jest.fn(() => builder);
    }
    builder.getMany = jest.fn(async () => rows);
    return builder;
}

function makeManager(rows: Array<Record<string, any>>, affected = 1) {
    const builder = makeQueryBuilder(rows);
    return {
        builder,
        createQueryBuilder: jest.fn(() => builder),
        update: jest.fn(async () => ({ affected })),
    };
}

describe("OpencodeTurnLeaseRepository", () => {
    it("claims no more than local capacity with SKIP LOCKED", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const rows = [
            { id: "11111111-1111-4111-8111-111111111111", status: "accepted" },
            { id: "22222222-2222-4222-8222-222222222222", status: "running" },
        ];
        const manager = makeManager(rows);
        const tokens = [
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ];
        const repository = new module.OpencodeTurnLeaseRepository();
        const claimed = await repository.claimAvailable(manager, {
            limit: 2,
            now: NOW,
            leaseDurationMs: 30_000,
            tokenFactory: () => tokens.shift()!,
        });

        expect(manager.builder.where).toHaveBeenCalledWith(
            expect.stringMatching(/status.*IN/),
            expect.objectContaining({ statuses: ["accepted", "running", "committing"] }),
        );
        expect(manager.builder.andWhere).toHaveBeenCalledWith(
            expect.stringMatching(/leaseToken IS NULL.*leaseExpiresAt <= :now/),
            { now: NOW },
        );
        expect(manager.builder.setLock).toHaveBeenCalledWith("pessimistic_write");
        expect(manager.builder.setOnLocked).toHaveBeenCalledWith("skip_locked");
        expect(manager.builder.take).toHaveBeenCalledWith(2);
        expect(manager.update).toHaveBeenCalledTimes(2);
        expect(claimed).toEqual([
            expect.objectContaining({ leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
            expect.objectContaining({ leaseToken: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
        ]);
        expect(claimed[0].leaseExpiresAt).toEqual(
            new Date("2026-08-21T00:00:30.000Z"),
        );
    });

    it("leaves excess and locked rows for another instance", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([
            { id: "11111111-1111-4111-8111-111111111111", status: "accepted" },
        ]);
        const repository = new module.OpencodeTurnLeaseRepository();
        const claimed = await repository.claimAvailable(manager, {
            limit: 1,
            now: NOW,
            leaseDurationMs: 30_000,
            tokenFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        expect(claimed).toHaveLength(1);
        expect(manager.builder.take).toHaveBeenCalledWith(1);
        expect(manager.builder.setOnLocked).toHaveBeenCalledWith("skip_locked");
    });

    it("lets only one instance claim a row locked by concurrent reconciliation", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const row = { id: "11111111-1111-4111-8111-111111111111", status: "accepted" };
        let rowLocked = false;
        const makeInstanceManager = () => {
            const manager = makeManager([]);
            manager.builder.getMany.mockImplementation(async () => {
                if (rowLocked) return [];
                rowLocked = true;
                return [{ ...row }];
            });
            return manager;
        };
        const firstManager = makeInstanceManager();
        const secondManager = makeInstanceManager();
        const repository = new module.OpencodeTurnLeaseRepository();

        const [first, second] = await Promise.all([
            repository.claimAvailable(firstManager, {
                limit: 1,
                now: NOW,
                leaseDurationMs: 30_000,
                tokenFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            }),
            repository.claimAvailable(secondManager, {
                limit: 1,
                now: NOW,
                leaseDurationMs: 30_000,
                tokenFactory: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            }),
        ]);

        expect([...first, ...second]).toHaveLength(1);
        expect(firstManager.builder.setOnLocked).toHaveBeenCalledWith("skip_locked");
        expect(secondManager.builder.setOnLocked).toHaveBeenCalledWith("skip_locked");
        expect(firstManager.update.mock.calls.length + secondManager.update.mock.calls.length).toBe(
            1,
        );
    });

    it("reclaims an expired lease with a fresh fenced token", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([
            {
                id: "11111111-1111-4111-8111-111111111111",
                status: "running",
                leaseToken: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                leaseExpiresAt: new Date("2026-08-20T23:59:59.000Z"),
            },
        ]);
        const repository = new module.OpencodeTurnLeaseRepository();
        const [claimed] = await repository.claimAvailable(manager, {
            limit: 1,
            now: NOW,
            leaseDurationMs: 30_000,
            tokenFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        expect(claimed).toMatchObject({
            leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            leaseExpiresAt: new Date("2026-08-21T00:00:30.000Z"),
        });
        expect(manager.builder.andWhere).toHaveBeenCalledWith(
            expect.stringMatching(/leaseExpiresAt <= :now/),
            { now: NOW },
        );
    });

    it("renews only an active row with the exact claim token", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([]);
        const repository = new module.OpencodeTurnLeaseRepository();
        const expiresAt = await repository.renew(manager, {
            turnId: "11111111-1111-4111-8111-111111111111",
            leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            now: NOW,
            leaseDurationMs: 45_000,
        });

        expect(manager.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "11111111-1111-4111-8111-111111111111",
                leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                status: expect.anything(),
            }),
            { leaseExpiresAt: new Date("2026-08-21T00:00:45.000Z") },
        );
        expect(expiresAt).toEqual(new Date("2026-08-21T00:00:45.000Z"));
    });

    it("releases only an active row with the exact claim token", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([]);
        const repository = new module.OpencodeTurnLeaseRepository();
        await repository.release(manager, {
            turnId: "11111111-1111-4111-8111-111111111111",
            leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        expect(manager.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "11111111-1111-4111-8111-111111111111",
                leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                status: expect.anything(),
            }),
            { leaseToken: null, leaseExpiresAt: null },
        );
    });

    it.each(["renew", "release"])("fences stale workers during %s", async (method) => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([], 0);
        const repository = new module.OpencodeTurnLeaseRepository();
        const params = {
            turnId: "11111111-1111-4111-8111-111111111111",
            leaseToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            now: NOW,
            leaseDurationMs: 30_000,
        };
        await expect(repository[method](manager, params)).rejects.toBeInstanceOf(
            module.OpencodeTurnLeaseLostError,
        );
    });

    it("does not issue a claim query when capacity is zero", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([]);
        const repository = new module.OpencodeTurnLeaseRepository();
        await expect(
            repository.claimAvailable(manager, {
                limit: 0,
                now: NOW,
                leaseDurationMs: 30_000,
            }),
        ).resolves.toEqual([]);
        expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("rejects invalid lease durations", async () => {
        const module = loadRepositoryModule();
        if (!module) return;

        const manager = makeManager([]);
        const repository = new module.OpencodeTurnLeaseRepository();
        await expect(
            repository.claimAvailable(manager, {
                limit: 1,
                now: NOW,
                leaseDurationMs: 0,
            }),
        ).rejects.toThrow("leaseDurationMs");
    });
});
