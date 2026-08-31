import { DataSource, type QueryRunner } from "@buildingai/db/typeorm";
import type { ClientConfig } from "pg";

import { SimplifyTenantUserManagement1789300000000 } from "../../../../../@buildingai/db/src/migrations/1789300000000-26.1.5-simplify-tenant-user-management";

/**
 * These tests exercise the migration against PostgreSQL rather than mocking SQL.
 * Set TENANT_MIGRATION_PG_INTEGRATION=1 to run them locally or in CI with a
 * disposable database; normal unit-test runs remain database independent.
 */
const runPostgres = process.env.TENANT_MIGRATION_PG_INTEGRATION === "1";
const describePostgres = runPostgres ? describe : describe.skip;
const schema = `tenant_default_migration_${process.pid}_${Date.now()}`;

function postgresConfig(): ClientConfig {
    return {
        host: process.env.TENANT_MIGRATION_TEST_PG_HOST ?? process.env.DB_HOST ?? "/tmp",
        port: Number(process.env.TENANT_MIGRATION_TEST_PG_PORT ?? process.env.DB_PORT ?? 5432),
        database: process.env.TENANT_MIGRATION_TEST_PG_DATABASE ?? process.env.DB_DATABASE ?? "postgres",
        user: process.env.TENANT_MIGRATION_TEST_PG_USER ?? process.env.DB_USERNAME ?? process.env.USER,
        password: process.env.TENANT_MIGRATION_TEST_PG_PASSWORD ?? process.env.DB_PASSWORD,
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
    await runner.query(`SET search_path TO "${schema}", public`);
    return runner;
}

describePostgres("simplified tenant default migration", () => {
    let source: DataSource;
    const migration = new SimplifyTenantUserManagement1789300000000();

    beforeAll(async () => {
        source = dataSource();
        await source.initialize();
        await source.query(`CREATE SCHEMA "${schema}"`);
        const runner = await runnerFor(source);
        try {
            await runner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
            await runner.query(`
                CREATE TABLE "user" (
                    "id" UUID PRIMARY KEY,
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "username" VARCHAR(255) NOT NULL UNIQUE,
                    "email" VARCHAR(255),
                    "nickname" VARCHAR(255),
                    "real_name" VARCHAR(32),
                    "is_root" INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE "tenants" (
                    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "name" VARCHAR(120) NOT NULL,
                    "code" VARCHAR(80) NOT NULL UNIQUE,
                    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                    "owner_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT
                );
                CREATE TABLE "tenant_memberships" (
                    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "tenant_id" UUID NOT NULL,
                    "user_id" UUID NOT NULL,
                    "role_code" VARCHAR(40) NOT NULL,
                    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
                    "accepted_at" TIMESTAMPTZ,
                    UNIQUE ("tenant_id", "user_id")
                );
                CREATE TABLE "ai_agent" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
                CREATE TABLE "ai_mcp_servers" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
                CREATE TABLE "datasets" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
                CREATE TABLE "ai_agent_chat_record" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
                CREATE TABLE "automation_job" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
                CREATE TABLE "tenant_credentials" ("id" UUID PRIMARY KEY, "tenant_id" UUID);
            `);
            await runner.query(`
                INSERT INTO "user" ("id", "username", "email", "nickname", "real_name", "is_root") VALUES
                    ('11111111-1111-4111-8111-111111111111', 'tan-jian', 'tan@example.test', '谭建', '谭建', 0),
                    ('22222222-2222-4222-8222-222222222222', 'other', 'other@example.test', 'Other', 'Other', 0);
                INSERT INTO "ai_agent" ("id") VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
                INSERT INTO "ai_mcp_servers" ("id") VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
                INSERT INTO "datasets" ("id") VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
                INSERT INTO "ai_agent_chat_record" ("id") VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
                INSERT INTO "automation_job" ("id") VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
                INSERT INTO "tenant_credentials" ("id") VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff');
            `);
        } finally {
            await runner.release();
        }
    });

    afterAll(async () => {
        if (!source?.isInitialized) return;
        await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await source.destroy();
    });

    it("is idempotent and backfills every user, administrator, and legacy content row", async () => {
        const runner = await runnerFor(source);
        try {
            await migration.up(runner);
            await migration.up(runner);

            const tenants = await runner.query(`SELECT id, admin_user_id, owner_id FROM "tenants" WHERE code = 'default'`);
            expect(tenants).toHaveLength(1);
            expect(tenants[0].admin_user_id).toBe("11111111-1111-4111-8111-111111111111");
            expect(tenants[0].owner_id).toBe(tenants[0].admin_user_id);

            const memberships = await runner.query(
                `SELECT user_id, role_code, status FROM "tenant_memberships" WHERE tenant_id = $1 ORDER BY user_id`,
                [tenants[0].id],
            );
            expect(memberships).toEqual([
                { user_id: "11111111-1111-4111-8111-111111111111", role_code: "admin", status: "active" },
                { user_id: "22222222-2222-4222-8222-222222222222", role_code: "member", status: "active" },
            ]);
            expect((await runner.query(`SELECT is_root FROM "user" WHERE id = $1`, [memberships[0].user_id]))[0].is_root).toBe(1);

            for (const table of ["ai_agent", "ai_mcp_servers", "datasets", "ai_agent_chat_record", "automation_job", "tenant_credentials"]) {
                const rows = await runner.query(`SELECT count(*)::int AS count FROM "${table}" WHERE tenant_id = $1`, [tenants[0].id]);
                expect(rows[0].count).toBe(1);
            }
            const stats = await runner.query(
                `SELECT table_name, mapped_count, quarantined_count
                 FROM "tenant_migration_backfill_stats"
                 WHERE tenant_id = $1 ORDER BY table_name`,
                [tenants[0].id],
            );
            expect(stats).toEqual(
                expect.arrayContaining([
                    { table_name: "ai_agent", mapped_count: 1, quarantined_count: 0 },
                    { table_name: "ai_mcp_servers", mapped_count: 1, quarantined_count: 0 },
                    { table_name: "datasets", mapped_count: 1, quarantined_count: 0 },
                ]),
            );
        } finally {
            await runner.release();
        }
    });
});
