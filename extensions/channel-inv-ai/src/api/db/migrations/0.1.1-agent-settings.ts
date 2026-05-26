import type { DataSource } from "@buildingai/db/typeorm";

import { CHI_AI_SCHEMA, CHI_TABLE, CHI_TABLE_LEGACY } from "../channel-inv-table-names";

async function resolveSettingsTable(dataSource: DataSource): Promise<string> {
    const rows: { table_name: string }[] = await dataSource.query(
        `
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name IN ($2, $3)
        ORDER BY CASE table_name WHEN $3 THEN 0 ELSE 1 END
        LIMIT 1
        `,
        [CHI_AI_SCHEMA, CHI_TABLE_LEGACY.APP_SETTINGS, CHI_TABLE.APP_SETTINGS],
    );
    return rows[0]?.table_name ?? CHI_TABLE.APP_SETTINGS;
}

export async function up(dataSource: DataSource): Promise<void> {
    const table = await resolveSettingsTable(dataSource);
    await dataSource.query(`
        ALTER TABLE "${CHI_AI_SCHEMA}"."${table}"
        ADD COLUMN IF NOT EXISTS "agent_id" varchar(64);
    `);
    await dataSource.query(`
        ALTER TABLE "${CHI_AI_SCHEMA}"."${table}"
        DROP COLUMN IF EXISTS "model_id";
    `);
    await dataSource.query(`
        ALTER TABLE "${CHI_AI_SCHEMA}"."${table}"
        DROP COLUMN IF EXISTS "mcp_server_ids";
    `);
}
