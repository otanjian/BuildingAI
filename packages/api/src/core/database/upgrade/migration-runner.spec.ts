jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { MigrationRunner, parseMigrationFilename } from "./migration-runner";

describe("MigrationRunner history compatibility", () => {
    it("ignores legacy migration filenames that do not contain a semantic version", () => {
        expect(parseMigrationFilename("1778600000000-add-agent-assignment.js")).toBeNull();
        expect(
            parseMigrationFilename("1787270400000-26.1.5-add-opencode-turn-consistency.js"),
        ).toEqual({
            name: "1787270400000-26.1.5-add-opencode-turn-consistency.js",
            version: "26.1.5",
            timestamp: 1787270400000,
        });
    });

    it("upgrades a legacy TypeORM migrations_history table before recording versioned migrations", async () => {
        const queryRunner = {
            connect: jest.fn(),
            query: jest.fn(async (_sql: string) => []),
            release: jest.fn(),
        };
        const dataSource = {
            createQueryRunner: jest.fn(() => queryRunner),
        };
        const runner = new MigrationRunner(dataSource as any);

        await (runner as any).ensureMigrationHistoryTable();

        const sql = queryRunner.query.mock.calls.map(([statement]) => String(statement)).join("\n");
        expect(sql).toContain('ADD COLUMN IF NOT EXISTS "version"');
        expect(sql).toContain('ADD COLUMN IF NOT EXISTS "executed_at"');
        expect(sql).toContain("uq_migrations_history_name");
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("reconciles unexecuted migrations added to the installed product version", async () => {
        const runner = new MigrationRunner({} as any);
        (runner as any).ensureMigrationHistoryTable = jest.fn(async () => undefined);
        (runner as any).getMigrationFiles = jest.fn(async () => [
            { name: "old.js", version: "26.1.4", timestamp: 1, path: "/old.js" },
            { name: "base.js", version: "26.1.5", timestamp: 2, path: "/base.js" },
            { name: "patch.js", version: "26.1.5", timestamp: 3, path: "/patch.js" },
        ]);
        (runner as any).executeMigration = jest.fn(async () => undefined);

        await runner.runPendingMigrationsForVersion("26.1.5");

        expect(
            (runner as any).executeMigration.mock.calls.map(([migration]) => migration.name),
        ).toEqual(["base.js", "patch.js"]);
    });
});
