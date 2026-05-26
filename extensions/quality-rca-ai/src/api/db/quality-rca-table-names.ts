/** PostgreSQL schema for the quality-rca-ai extension (from extension identifier). */
export const QRCA_AI_SCHEMA = "quality_rca_ai";

/**
 * QRCA-owned table names (schema `quality_rca_ai`).
 * All application tables use the `quality-rca-` prefix for isolation from generic names.
 */
export const QRCA_TABLE = {
    CHECK_RULES: "quality-rca-check_rules",
    CHECK_RESULTS: "quality-rca-check_results",
    CHECK_RUNS: "quality-rca-check_runs",
    CHECK_RUN_ITEMS: "quality-rca-check_run_items",
    APP_SETTINGS: "quality-rca-app_settings",
    RCA_SESSIONS: "quality-rca-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const QRCA_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const QRCA_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [QRCA_TABLE_LEGACY.CHECK_RULES, QRCA_TABLE.CHECK_RULES],
    [QRCA_TABLE_LEGACY.CHECK_RESULTS, QRCA_TABLE.CHECK_RESULTS],
    [QRCA_TABLE_LEGACY.CHECK_RUNS, QRCA_TABLE.CHECK_RUNS],
    [QRCA_TABLE_LEGACY.CHECK_RUN_ITEMS, QRCA_TABLE.CHECK_RUN_ITEMS],
    [QRCA_TABLE_LEGACY.APP_SETTINGS, QRCA_TABLE.APP_SETTINGS],
    [QRCA_TABLE_LEGACY.RCA_SESSIONS, QRCA_TABLE.RCA_SESSIONS],
];
