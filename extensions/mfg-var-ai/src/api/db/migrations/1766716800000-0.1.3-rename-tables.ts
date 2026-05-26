import type { DataSource } from "@buildingai/db/typeorm";

import { MFGV_AI_SCHEMA, MFGV_TABLE_RENAMES } from "../mfg-var-table-names";

async function tableExists(dataSource: DataSource, tableName: string): Promise<boolean> {
    const rows: unknown[] = await dataSource.query(
        `
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
        LIMIT 1
        `,
        [MFGV_AI_SCHEMA, tableName],
    );
    return rows.length > 0;
}

async function rowCount(dataSource: DataSource, tableName: string): Promise<number> {
    const rows: { count: string }[] = await dataSource.query(
        `SELECT COUNT(*)::text AS count FROM "${MFGV_AI_SCHEMA}"."${tableName}"`,
    );
    return Number(rows[0]?.count ?? 0);
}

/**
 * Rename MFGV tables to `mfg-var-*` prefixed names (idempotent).
 * If synchronize created empty `mfg-var-*` tables alongside legacy names, drop the empty duplicates first.
 */
export async function up(dataSource: DataSource): Promise<void> {
    for (const [legacyName, tableName] of MFGV_TABLE_RENAMES) {
        const hasLegacy = await tableExists(dataSource, legacyName);
        const hasCurrent = await tableExists(dataSource, tableName);

        if (hasLegacy && hasCurrent) {
            const legacyRows = await rowCount(dataSource, legacyName);
            const currentRows = await rowCount(dataSource, tableName);
            if (legacyRows > 0 && currentRows === 0) {
                await dataSource.query(
                    `DROP TABLE "${MFGV_AI_SCHEMA}"."${tableName}"`,
                );
            } else if (legacyRows === 0 && currentRows > 0) {
                await dataSource.query(
                    `DROP TABLE "${MFGV_AI_SCHEMA}"."${legacyName}"`,
                );
                continue;
            } else if (legacyRows === 0 && currentRows === 0) {
                await dataSource.query(
                    `DROP TABLE "${MFGV_AI_SCHEMA}"."${legacyName}"`,
                );
                continue;
            }
        }

        const legacyStillExists = await tableExists(dataSource, legacyName);
        const currentStillExists = await tableExists(dataSource, tableName);
        if (legacyStillExists && !currentStillExists) {
            await dataSource.query(
                `ALTER TABLE "${MFGV_AI_SCHEMA}"."${legacyName}" RENAME TO "${tableName}"`,
            );
        }
    }
}
