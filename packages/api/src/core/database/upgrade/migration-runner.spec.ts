jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { MigrationRunner } from "./migration-runner";

describe("MigrationRunner history compatibility", () => {
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
});
