import type { DataSource } from "@buildingai/db/typeorm";

import { INVO_AI_SCHEMA, INVO_TABLE_RENAMES } from "../inv-opt-table-names";

async function tableExists(dataSource: DataSource, tableName: string): Promise<boolean> {
    const rows: unknown[] = await dataSource.query(
        `
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
        LIMIT 1
        `,
        [INVO_AI_SCHEMA, tableName],
    );
    return rows.length > 0;
}

async function rowCount(dataSource: DataSource, tableName: string): Promise<number> {
    const rows: { count: string }[] = await dataSource.query(
        `SELECT COUNT(*)::text AS count FROM "${INVO_AI_SCHEMA}"."${tableName}"`,
    );
    return Number(rows[0]?.count ?? 0);
}

/**
 * Rename INVO tables to `inv-opt-*` prefixed names (idempotent).
 * If synchronize created empty `inv-opt-*` tables alongside legacy names, drop the empty duplicates first.
 */
export async function up(dataSource: DataSource): Promise<void> {
    for (const [legacyName, tableName] of INVO_TABLE_RENAMES) {
        const hasLegacy = await tableExists(dataSource, legacyName);
        const hasCurrent = await tableExists(dataSource, tableName);

        if (hasLegacy && hasCurrent) {
            const legacyRows = await rowCount(dataSource, legacyName);
            const currentRows = await rowCount(dataSource, tableName);
            if (legacyRows > 0 && currentRows === 0) {
                await dataSource.query(
                    `DROP TABLE "${INVO_AI_SCHEMA}"."${tableName}"`,
                );
            } else if (legacyRows === 0 && currentRows > 0) {
                await dataSource.query(
                    `DROP TABLE "${INVO_AI_SCHEMA}"."${legacyName}"`,
                );
                continue;
            } else if (legacyRows === 0 && currentRows === 0) {
                await dataSource.query(
                    `DROP TABLE "${INVO_AI_SCHEMA}"."${legacyName}"`,
                );
                continue;
            }
        }

        const legacyStillExists = await tableExists(dataSource, legacyName);
        const currentStillExists = await tableExists(dataSource, tableName);
        if (legacyStillExists && !currentStillExists) {
            await dataSource.query(
                `ALTER TABLE "${INVO_AI_SCHEMA}"."${legacyName}" RENAME TO "${tableName}"`,
            );
        }
    }
}
