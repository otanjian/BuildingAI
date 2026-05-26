/** PostgreSQL schema for the ehcs-ai extension (from extension identifier). */
export const EHCS_AI_SCHEMA = "ehcs_ai";

/**
 * EHCS-owned table names (schema `ehcs_ai`).
 * All application tables use the `ehcs-` prefix for isolation from generic names.
 */
export const EHCS_TABLE = {
    CHECK_RULES: "ehcs-check_rules",
    CHECK_RESULTS: "ehcs-check_results",
    CHECK_RUNS: "ehcs-check_runs",
    CHECK_RUN_ITEMS: "ehcs-check_run_items",
    APP_SETTINGS: "ehcs-app_settings",
    RCA_SESSIONS: "ehcs-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const EHCS_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const EHCS_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [EHCS_TABLE_LEGACY.CHECK_RULES, EHCS_TABLE.CHECK_RULES],
    [EHCS_TABLE_LEGACY.CHECK_RESULTS, EHCS_TABLE.CHECK_RESULTS],
    [EHCS_TABLE_LEGACY.CHECK_RUNS, EHCS_TABLE.CHECK_RUNS],
    [EHCS_TABLE_LEGACY.CHECK_RUN_ITEMS, EHCS_TABLE.CHECK_RUN_ITEMS],
    [EHCS_TABLE_LEGACY.APP_SETTINGS, EHCS_TABLE.APP_SETTINGS],
    [EHCS_TABLE_LEGACY.RCA_SESSIONS, EHCS_TABLE.RCA_SESSIONS],
];
