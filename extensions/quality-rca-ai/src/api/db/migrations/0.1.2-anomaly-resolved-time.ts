import type { DataSource } from "@buildingai/db/typeorm";

import { QRCA_AI_SCHEMA, QRCA_TABLE, QRCA_TABLE_LEGACY } from "../quality-rca-table-names";

async function resolveResultsTable(dataSource: DataSource): Promise<string> {
    const rows: { table_name: string }[] = await dataSource.query(
        `
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name IN ($2, $3)
        ORDER BY CASE table_name WHEN $3 THEN 0 ELSE 1 END
        LIMIT 1
        `,
        [QRCA_AI_SCHEMA, QRCA_TABLE_LEGACY.CHECK_RESULTS, QRCA_TABLE.CHECK_RESULTS],
    );
    return rows[0]?.table_name ?? QRCA_TABLE.CHECK_RESULTS;
}

export async function up(dataSource: DataSource): Promise<void> {
    const table = await resolveResultsTable(dataSource);
    await dataSource.query(`
        ALTER TABLE "${QRCA_AI_SCHEMA}"."${table}"
        ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;
    `);
    await dataSource.query(`
        UPDATE "${QRCA_AI_SCHEMA}"."${table}"
        SET "resolved_at" = "check_time"
        WHERE "status" IN ('已解决', 'ai自动修复')
          AND "resolved_at" IS NULL;
    `);
}
