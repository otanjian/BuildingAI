import { Client, type ClientConfig } from "pg";

const RUN_POSTGRES_INTEGRATION = process.env.OPENCODE_TURN_PG_INTEGRATION === "1";
const describePostgres = RUN_POSTGRES_INTEGRATION ? describe : describe.skip;
const TABLE_NAME = `opencode_turn_lease_it_${process.pid}_${Date.now()}`;
const TURN_ID = "11111111-1111-4111-8111-111111111111";
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
                status TEXT NOT NULL,
                lease_token UUID,
                lease_expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);
        await admin.query(
            `INSERT INTO "${TABLE_NAME}" (id, status) VALUES ($1, 'accepted')`,
            [TURN_ID],
        );
    });

    afterAll(async () => {
        await Promise.allSettled([
            firstInstance.query("ROLLBACK"),
            secondInstance.query("ROLLBACK"),
        ]);
        await admin.query(`DROP TABLE IF EXISTS "${TABLE_NAME}"`);
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
});
