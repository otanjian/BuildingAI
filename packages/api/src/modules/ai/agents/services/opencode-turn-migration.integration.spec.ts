import { DataSource, type QueryRunner } from "@buildingai/db/typeorm";
import type { ClientConfig } from "pg";

import { Migration1787270400000 } from "../../../../../../@buildingai/db/src/migrations/1787270400000-26.1.5-add-opencode-turn-consistency";

const RUN_POSTGRES_INTEGRATION = process.env.OPENCODE_TURN_PG_INTEGRATION === "1";
const describePostgres = RUN_POSTGRES_INTEGRATION ? describe : describe.skip;
const SCHEMA = `opencode_turn_migration_it_${process.pid}_${Date.now()}`;
const LEGACY_CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const DURABLE_CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const INPUT_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const TURN_ID = "44444444-4444-4444-8444-444444444444";

function postgresConfig(): ClientConfig {
    return {
        host: process.env.OPENCODE_TURN_TEST_PG_HOST ?? process.env.DB_HOST ?? "/tmp",
        port: Number(process.env.OPENCODE_TURN_TEST_PG_PORT ?? process.env.DB_PORT ?? 5432),
        database:
            process.env.OPENCODE_TURN_TEST_PG_DATABASE ??
            process.env.DB_DATABASE ??
            "postgres",
        user:
            process.env.OPENCODE_TURN_TEST_PG_USER ??
            process.env.DB_USERNAME ??
            process.env.USER,
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

describePostgres("OpenCode turn installed-version migration", () => {
    let first: DataSource;
    const migration = new Migration1787270400000();

    beforeAll(async () => {
        first = dataSource();
        await first.initialize();
        await first.query(`CREATE SCHEMA "${SCHEMA}"`);
        const runner = await runnerFor(first);
        try {
            await runner.query(`
                CREATE TABLE "ai_agent_chat_record" (
                    "id" UUID PRIMARY KEY,
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "metadata" JSONB
                )
            `);
            await runner.query(`
                CREATE TABLE "ai_agent_chat_message" (
                    "id" UUID PRIMARY KEY
                )
            `);
            await runner.query(`
                CREATE TABLE "account_log" (
                    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "association_no" VARCHAR(64),
                    "action" INTEGER NOT NULL
                )
            `);
            await runner.query(
                `INSERT INTO "ai_agent_chat_record" (id, metadata)
                 VALUES ($1, '{"provider":"opencode","opencodeSessionId":"ses_legacy","opencodeTurnStatus":"running"}')`,
                [LEGACY_CONVERSATION_ID],
            );
        } finally {
            await runner.release();
        }
    });

    afterAll(async () => {
        if (first?.isInitialized) {
            await first.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
            await first.destroy();
        }
    });

    it("upgrades idempotently and preserves active legacy plus durable turns across restart", async () => {
        const firstRunner = await runnerFor(first);
        try {
            await migration.up(firstRunner);
            await migration.up(firstRunner);
            await firstRunner.query(
                `INSERT INTO "ai_agent_chat_record" (id, metadata)
                 VALUES ($1, '{"provider":"opencode"}')`,
                [DURABLE_CONVERSATION_ID],
            );
            await firstRunner.query(`INSERT INTO "ai_agent_chat_message" (id) VALUES ($1)`, [
                INPUT_MESSAGE_ID,
            ]);
            await firstRunner.query(
                `INSERT INTO "ai_agent_opencode_turn" (
                    id, conversation_id, request_hash, dispatch_snapshot,
                    runtime_config_hash, input_message_id, opencode_user_message_id,
                    status, last_activity_at
                 ) VALUES ($1, $2, 'request-hash', '{}', 'runtime-hash', $3, 'msg_remote',
                           'accepted', now())`,
                [TURN_ID, DURABLE_CONVERSATION_ID, INPUT_MESSAGE_ID],
            );
        } finally {
            await firstRunner.release();
        }

        const restarted = dataSource();
        await restarted.initialize();
        const restartRunner = await runnerFor(restarted);
        try {
            const rows = await restartRunner.query(
                `SELECT record.id,
                        record.metadata ->> 'opencodeTurnStatus' AS legacy_status,
                        turn.status AS durable_status
                 FROM "ai_agent_chat_record" record
                 LEFT JOIN "ai_agent_opencode_turn" turn ON turn.conversation_id = record.id
                 WHERE record.id IN ($1, $2)
                 ORDER BY record.id`,
                [LEGACY_CONVERSATION_ID, DURABLE_CONVERSATION_ID],
            );
            expect(rows).toEqual([
                {
                    id: LEGACY_CONVERSATION_ID,
                    legacy_status: "running",
                    durable_status: null,
                },
                {
                    id: DURABLE_CONVERSATION_ID,
                    legacy_status: null,
                    durable_status: "accepted",
                },
            ]);
            const constraints = await restartRunner.query(
                `SELECT conname FROM pg_constraint
                 WHERE conrelid = 'ai_agent_opencode_turn'::regclass
                 ORDER BY conname`,
            );
            expect(constraints.map((row: { conname: string }) => row.conname)).toEqual(
                expect.arrayContaining([
                    "ck_oc_turn_lifecycle",
                    "ck_oc_turn_lease_pair",
                    "ck_oc_turn_status",
                    "fk_oc_turn_conversation",
                    "fk_oc_turn_input_message",
                ]),
            );
        } finally {
            await restartRunner.release();
            await restarted.destroy();
        }
    });

    it("rolls back the schema on an installed snapshot without touching legacy records", async () => {
        const runner = await runnerFor(first);
        try {
            await runner.query(`DELETE FROM "ai_agent_opencode_turn"`);
            await migration.down(runner);
            const legacy = await runner.query(
                `SELECT metadata ->> 'opencodeSessionId' AS session_id
                 FROM "ai_agent_chat_record" WHERE id = $1`,
                [LEGACY_CONVERSATION_ID],
            );
            expect(legacy).toEqual([{ session_id: "ses_legacy" }]);
            const schema = await runner.query(
                `SELECT to_regclass('ai_agent_opencode_turn') AS turn_table,
                        EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = $1
                              AND table_name = 'ai_agent_chat_record'
                              AND column_name = 'opencode_session_id'
                        ) AS has_mapping_column`,
                [SCHEMA],
            );
            expect(schema).toEqual([{ turn_table: null, has_mapping_column: false }]);
        } finally {
            await runner.release();
        }
    });
});
