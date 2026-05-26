/** PostgreSQL schema for the forecast-ai extension (from extension identifier). */
export const FCST_AI_SCHEMA = "forecast_ai";

/**
 * FCST-owned table names (schema `forecast_ai`).
 * All application tables use the `forecast-` prefix for isolation from generic names.
 */
export const FCST_TABLE = {
    CHECK_RULES: "forecast-check_rules",
    CHECK_RESULTS: "forecast-check_results",
    CHECK_RUNS: "forecast-check_runs",
    CHECK_RUN_ITEMS: "forecast-check_run_items",
    APP_SETTINGS: "forecast-app_settings",
    RCA_SESSIONS: "forecast-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const FCST_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const FCST_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [FCST_TABLE_LEGACY.CHECK_RULES, FCST_TABLE.CHECK_RULES],
    [FCST_TABLE_LEGACY.CHECK_RESULTS, FCST_TABLE.CHECK_RESULTS],
    [FCST_TABLE_LEGACY.CHECK_RUNS, FCST_TABLE.CHECK_RUNS],
    [FCST_TABLE_LEGACY.CHECK_RUN_ITEMS, FCST_TABLE.CHECK_RUN_ITEMS],
    [FCST_TABLE_LEGACY.APP_SETTINGS, FCST_TABLE.APP_SETTINGS],
    [FCST_TABLE_LEGACY.RCA_SESSIONS, FCST_TABLE.RCA_SESSIONS],
];
