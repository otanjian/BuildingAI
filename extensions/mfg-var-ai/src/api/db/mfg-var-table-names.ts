/** PostgreSQL schema for the mfg-var-ai extension (from extension identifier). */
export const MFGV_AI_SCHEMA = "mfg_var_ai";

/**
 * MFGV-owned table names (schema `mfg_var_ai`).
 * All application tables use the `mfg-var-` prefix for isolation from generic names.
 */
export const MFGV_TABLE = {
    CHECK_RULES: "mfg-var-check_rules",
    CHECK_RESULTS: "mfg-var-check_results",
    CHECK_RUNS: "mfg-var-check_runs",
    CHECK_RUN_ITEMS: "mfg-var-check_run_items",
    APP_SETTINGS: "mfg-var-app_settings",
    RCA_SESSIONS: "mfg-var-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const MFGV_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const MFGV_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [MFGV_TABLE_LEGACY.CHECK_RULES, MFGV_TABLE.CHECK_RULES],
    [MFGV_TABLE_LEGACY.CHECK_RESULTS, MFGV_TABLE.CHECK_RESULTS],
    [MFGV_TABLE_LEGACY.CHECK_RUNS, MFGV_TABLE.CHECK_RUNS],
    [MFGV_TABLE_LEGACY.CHECK_RUN_ITEMS, MFGV_TABLE.CHECK_RUN_ITEMS],
    [MFGV_TABLE_LEGACY.APP_SETTINGS, MFGV_TABLE.APP_SETTINGS],
    [MFGV_TABLE_LEGACY.RCA_SESSIONS, MFGV_TABLE.RCA_SESSIONS],
];
