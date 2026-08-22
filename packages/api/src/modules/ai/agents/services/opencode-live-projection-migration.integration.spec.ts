import { DataSource, type QueryRunner } from "@buildingai/db/typeorm";
import type { ClientConfig } from "pg";

import { Migration1787356800000 } from "../../../../../../@buildingai/db/src/migrations/1787356800000-26.1.5-add-opencode-live-projection";

const RUN_POSTGRES_INTEGRATION = process.env.OPENCODE_TURN_PG_INTEGRATION === "1";
const describePostgres = RUN_POSTGRES_INTEGRATION ? describe : describe.skip;
const SCHEMA = `opencode_projection_migration_it_${process.pid}_${Date.now()}`;

function postgresConfig(): ClientConfig {
    return {
        host: process.env.OPENCODE_TURN_TEST_PG_HOST ?? process.env.DB_HOST ?? "/tmp",
        port: Number(process.env.OPENCODE_TURN_TEST_PG_PORT ?? process.env.DB_PORT ?? 5432),
        database:
            process.env.OPENCODE_TURN_TEST_PG_DATABASE ?? process.env.DB_DATABASE ?? "postgres",
        user: process.env.OPENCODE_TURN_TEST_PG_USER ?? process.env.DB_USERNAME ?? process.env.USER,
        password: process.env.OPENCODE_TURN_TEST_PG_PASSWORD ?? process.env.DB_PASSWORD,
        connectionTimeoutMillis: 3_000,
    };
}

function dataSource(): DataSource {
    const config = postgresConfig();
    return new DataSource({
        type: "postgres",
        host: config.host as string,
        port: config.port,
        database: config.database as string,
        username: config.user as string,
        password: config.password as string | undefined,
        connectTimeoutMS: config.connectionTimeoutMillis,
    });
}

async function runnerFor(source: DataSource): Promise<QueryRunner> {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.query(`SET search_path TO "${SCHEMA}", public`);
    return runner;
}

describePostgres("OpenCode live projection migration", () => {
    let source: DataSource;
    const migration = new Migration1787356800000();

    beforeAll(async () => {
        source = dataSource();
        await source.initialize();
        await source.query(`CREATE SCHEMA "${SCHEMA}"`);
        const runner = await runnerFor(source);
        try {
            await runner.query(`
                CREATE TABLE "ai_agent_opencode_turn" (
                    "id" UUID PRIMARY KEY,
                    "status" VARCHAR(16) NOT NULL
                )
            `);
        } finally {
            await runner.release();
        }
    });

    afterAll(async () => {
        if (!source?.isInitialized) return;
        await source.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
        await source.destroy();
    });

    it("replays up/down/up and enforces projection lifecycle constraints", async () => {
        const runner = await runnerFor(source);
        try {
            await migration.up(runner);
            await migration.up(runner);
            await runner.query(`
                INSERT INTO "ai_agent_opencode_turn"
                    (id, status, live_projection, projection_version, projection_updated_at)
                VALUES
                    ('11111111-1111-4111-8111-111111111111', 'running', '{"parts":[]}', 1, now()),
                    ('22222222-2222-4222-8222-222222222222', 'completed', NULL, 0, NULL)
            `);
            await expect(
                runner.query(`
                    INSERT INTO "ai_agent_opencode_turn"
                        (id, status, live_projection, projection_version, projection_updated_at)
                    VALUES
                        ('33333333-3333-4333-8333-333333333333', 'completed', '{"parts":[]}', 1, now())
                `),
            ).rejects.toThrow();

            await runner.query(`DELETE FROM "ai_agent_opencode_turn"`);
            await migration.down(runner);
            await migration.up(runner);

            const columns = await runner.query(
                `SELECT column_name
                 FROM information_schema.columns
                 WHERE table_schema = $1
                   AND table_name = 'ai_agent_opencode_turn'
                   AND column_name IN ('live_projection', 'projection_version', 'projection_updated_at')
                 ORDER BY column_name`,
                [SCHEMA],
            );
            expect(columns).toEqual([
                { column_name: "live_projection" },
                { column_name: "projection_updated_at" },
                { column_name: "projection_version" },
            ]);
        } finally {
            await runner.release();
        }
    });
});
