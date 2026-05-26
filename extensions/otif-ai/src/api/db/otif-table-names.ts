/** PostgreSQL schema for the otif-ai extension (from extension identifier). */
export const OTIF_AI_SCHEMA = "otif_ai";

/**
 * OTIF-owned table names (schema `otif_ai`).
 * All application tables use the `otif-` prefix for isolation from generic names.
 */
export const OTIF_TABLE = {
    CHECK_RULES: "otif-check_rules",
    CHECK_RESULTS: "otif-check_results",
    CHECK_RUNS: "otif-check_runs",
    CHECK_RUN_ITEMS: "otif-check_run_items",
    APP_SETTINGS: "otif-app_settings",
    RCA_SESSIONS: "otif-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const OTIF_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const OTIF_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [OTIF_TABLE_LEGACY.CHECK_RULES, OTIF_TABLE.CHECK_RULES],
    [OTIF_TABLE_LEGACY.CHECK_RESULTS, OTIF_TABLE.CHECK_RESULTS],
    [OTIF_TABLE_LEGACY.CHECK_RUNS, OTIF_TABLE.CHECK_RUNS],
    [OTIF_TABLE_LEGACY.CHECK_RUN_ITEMS, OTIF_TABLE.CHECK_RUN_ITEMS],
    [OTIF_TABLE_LEGACY.APP_SETTINGS, OTIF_TABLE.APP_SETTINGS],
    [OTIF_TABLE_LEGACY.RCA_SESSIONS, OTIF_TABLE.RCA_SESSIONS],
];
