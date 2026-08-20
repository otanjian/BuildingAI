import { Client, type ClientConfig } from "pg";

const RUN_POSTGRES_INTEGRATION = process.env.OPENCODE_TURN_PG_INTEGRATION === "1";
const describePostgres = RUN_POSTGRES_INTEGRATION ? describe : describe.skip;
const TABLE_NAME = `opencode_turn_lease_it_${process.pid}_${Date.now()}`;
const MUTATION_TABLE = `${TABLE_NAME}_mutation`;
const ASSISTANT_TABLE = `${TABLE_NAME}_assistant`;
const TURN_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const FIRST_TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECOND_TOKEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

async function selectClaimable(client: Client, now: Date) {
    return client.query<{ id: string; lease_token: string | null; lease_expires_at: Date | null }>(
        `SELECT id, lease_token, lease_expires_at
         FROM "${TABLE_NAME}"
         WHERE status IN ('accepted', 'running', 'committing')
           AND (lease_token IS NULL OR lease_expires_at <= $1)
         ORDER BY lease_expires_at ASC NULLS FIRST, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [now],
    );
}

describePostgres("OpenCode turn lease PostgreSQL integration", () => {
    const admin = new Client(postgresConfig());
    const firstInstance = new Client(postgresConfig());
    const secondInstance = new Client(postgresConfig());

    beforeAll(async () => {
        await Promise.all([admin.connect(), firstInstance.connect(), secondInstance.connect()]);
        await admin.query(`
            CREATE UNLOGGED TABLE "${TABLE_NAME}" (
                id UUID PRIMARY KEY,
                conversation_id UUID NOT NULL,
                status TEXT NOT NULL,
                lease_token UUID,
                lease_expires_at TIMESTAMPTZ,
                opencode_session_id TEXT NOT NULL,
                opencode_user_message_id TEXT NOT NULL,
                assistant_message_id UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);
        await admin.query(`
            CREATE UNLOGGED TABLE "${MUTATION_TABLE}" (
                sequence BIGSERIAL PRIMARY KEY,
                instance_id TEXT NOT NULL,
                conversation_id UUID NOT NULL,
                session_id TEXT NOT NULL,
                request_id TEXT NOT NULL
            )
        `);
        await admin.query(`
            CREATE UNLOGGED TABLE "${ASSISTANT_TABLE}" (
                id UUID PRIMARY KEY,
                turn_id UUID NOT NULL UNIQUE,
                remote_parent_id TEXT NOT NULL
            )
        `);
        await admin.query(
            `INSERT INTO "${TABLE_NAME}" (
                id, conversation_id, status, opencode_session_id, opencode_user_message_id
             ) VALUES ($1, $2, 'accepted', 'ses_exact', 'msg_exact')`,
            [TURN_ID, CONVERSATION_ID],
        );
    });

    beforeEach(async () => {
        await admin.query(`TRUNCATE "${MUTATION_TABLE}", "${ASSISTANT_TABLE}"`);
        await admin.query(
            `UPDATE "${TABLE_NAME}"
             SET status = 'accepted', lease_token = NULL, lease_expires_at = NULL,
                 assistant_message_id = NULL,
                 opencode_session_id = 'ses_exact', opencode_user_message_id = 'msg_exact'
             WHERE id = $1`,
            [TURN_ID],
        );
    });

    afterAll(async () => {
        await Promise.allSettled([
            firstInstance.query("ROLLBACK"),
            secondInstance.query("ROLLBACK"),
        ]);
        await admin.query(`DROP TABLE IF EXISTS "${TABLE_NAME}"`);
        await admin.query(`DROP TABLE IF EXISTS "${MUTATION_TABLE}"`);
        await admin.query(`DROP TABLE IF EXISTS "${ASSISTANT_TABLE}"`);
        await Promise.all([admin.end(), firstInstance.end(), secondInstance.end()]);
    });

    it("excludes a second instance and allows takeover only after lease expiry", async () => {
        const now = new Date("2026-08-21T00:00:00.000Z");
        const firstExpiry = new Date("2026-08-21T00:00:30.000Z");

        await firstInstance.query("BEGIN");
        const firstSelection = await selectClaimable(firstInstance, now);
        expect(firstSelection.rows).toHaveLength(1);

        await secondInstance.query("BEGIN");
        const lockedSelection = await selectClaimable(secondInstance, now);
        expect(lockedSelection.rows).toEqual([]);

        const firstAssignment = await firstInstance.query(
            `UPDATE "${TABLE_NAME}"
             SET lease_token = $1, lease_expires_at = $2
             WHERE id = $3 AND lease_token IS NULL AND lease_expires_at IS NULL`,
            [FIRST_TOKEN, firstExpiry, TURN_ID],
        );
        expect(firstAssignment.rowCount).toBe(1);
        await firstInstance.query("COMMIT");

        const unexpiredSelection = await selectClaimable(secondInstance, now);
        expect(unexpiredSelection.rows).toEqual([]);
        await secondInstance.query("COMMIT");

        await admin.query(
            `UPDATE "${TABLE_NAME}" SET lease_expires_at = $1 WHERE id = $2`,
            [new Date("2026-08-20T23:59:59.000Z"), TURN_ID],
        );

        await secondInstance.query("BEGIN");
        const expiredSelection = await selectClaimable(secondInstance, now);
        expect(expiredSelection.rows).toHaveLength(1);
        expect(expiredSelection.rows[0].lease_token).toBe(FIRST_TOKEN);

        const secondAssignment = await secondInstance.query(
            `UPDATE "${TABLE_NAME}"
             SET lease_token = $1, lease_expires_at = $2
             WHERE id = $3
               AND lease_token = $4
               AND lease_expires_at <= $5`,
            [SECOND_TOKEN, new Date("2026-08-21T00:00:30.000Z"), TURN_ID, FIRST_TOKEN, now],
        );
        expect(secondAssignment.rowCount).toBe(1);
        await secondInstance.query("COMMIT");

        const finalRow = await admin.query(
            `SELECT lease_token FROM "${TABLE_NAME}" WHERE id = $1`,
            [TURN_ID],
        );
        expect(finalRow.rows).toEqual([{ lease_token: SECOND_TOKEN }]);
    });

    it("serializes shared-conversation mutations and preserves exact remote targeting", async () => {
        const lockKey = `opencode-conversation:${CONVERSATION_ID}`;
        await firstInstance.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [lockKey]);

        let secondAcquired = false;
        const secondLock = secondInstance
            .query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [lockKey])
            .then(() => {
                secondAcquired = true;
            });
        await new Promise((resolve) => setTimeout(resolve, 25));
        expect(secondAcquired).toBe(false);

        await firstInstance.query(
            `INSERT INTO "${MUTATION_TABLE}" (
                instance_id, conversation_id, session_id, request_id
             ) VALUES ('instance-a', $1, 'ses_exact', 'per_exact')`,
            [CONVERSATION_ID],
        );
        await firstInstance.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [lockKey]);

        await secondLock;
        await secondInstance.query(
            `INSERT INTO "${MUTATION_TABLE}" (
                instance_id, conversation_id, session_id, request_id
             ) VALUES ('instance-b', $1, 'ses_exact', 'q_exact')`,
            [CONVERSATION_ID],
        );
        await secondInstance.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [lockKey]);

        const mutations = await admin.query(
            `SELECT instance_id, conversation_id, session_id, request_id
             FROM "${MUTATION_TABLE}" ORDER BY sequence`,
        );
        expect(mutations.rows).toEqual([
            {
                instance_id: "instance-a",
                conversation_id: CONVERSATION_ID,
                session_id: "ses_exact",
                request_id: "per_exact",
            },
            {
                instance_id: "instance-b",
                conversation_id: CONVERSATION_ID,
                session_id: "ses_exact",
                request_id: "q_exact",
            },
        ]);
    });

    it("fences a stale worker and permits exactly one local final commit", async () => {
        const assistantId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
        await admin.query(
            `UPDATE "${TABLE_NAME}"
             SET status = 'committing', lease_token = $1, lease_expires_at = now() - interval '1 second'
             WHERE id = $2`,
            [FIRST_TOKEN, TURN_ID],
        );
        await admin.query(
            `UPDATE "${TABLE_NAME}"
             SET lease_token = $1, lease_expires_at = now() + interval '30 seconds'
             WHERE id = $2 AND lease_token = $3`,
            [SECOND_TOKEN, TURN_ID, FIRST_TOKEN],
        );

        const staleWrite = await firstInstance.query(
            `UPDATE "${TABLE_NAME}"
             SET status = 'completed', assistant_message_id = $1
             WHERE id = $2 AND status = 'committing' AND lease_token = $3`,
            [assistantId, TURN_ID, FIRST_TOKEN],
        );
        expect(staleWrite.rowCount).toBe(0);

        await secondInstance.query("BEGIN");
        await secondInstance.query(
            `INSERT INTO "${ASSISTANT_TABLE}" (id, turn_id, remote_parent_id)
             VALUES ($1, $2, 'msg_exact')`,
            [assistantId, TURN_ID],
        );
        const currentWrite = await secondInstance.query(
            `UPDATE "${TABLE_NAME}"
             SET status = 'completed', assistant_message_id = $1,
                 lease_token = NULL, lease_expires_at = NULL
             WHERE id = $2 AND status = 'committing' AND lease_token = $3`,
            [assistantId, TURN_ID, SECOND_TOKEN],
        );
        expect(currentWrite.rowCount).toBe(1);
        await secondInstance.query("COMMIT");

        const staleRetry = await firstInstance.query(
            `UPDATE "${TABLE_NAME}"
             SET assistant_message_id = $1
             WHERE id = $2 AND status = 'committing' AND lease_token = $3`,
            [assistantId, TURN_ID, FIRST_TOKEN],
        );
        expect(staleRetry.rowCount).toBe(0);

        const final = await admin.query(
            `SELECT turn.status, turn.assistant_message_id, COUNT(assistant.id)::int AS assistants,
                    MIN(assistant.remote_parent_id) AS remote_parent_id
             FROM "${TABLE_NAME}" turn
             LEFT JOIN "${ASSISTANT_TABLE}" assistant ON assistant.turn_id = turn.id
             WHERE turn.id = $1
             GROUP BY turn.id`,
            [TURN_ID],
        );
        expect(final.rows).toEqual([
            {
                status: "completed",
                assistant_message_id: assistantId,
                assistants: 1,
                remote_parent_id: "msg_exact",
            },
        ]);
    });
});
