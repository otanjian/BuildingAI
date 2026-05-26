/** PostgreSQL schema for the ap-opt-ai extension (from extension identifier). */
export const APO_AI_SCHEMA = "ap_opt_ai";

/**
 * APO-owned table names (schema `ap_opt_ai`).
 * All application tables use the `ap-opt-` prefix for isolation from generic names.
 */
export const APO_TABLE = {
    CHECK_RULES: "ap-opt-check_rules",
    CHECK_RESULTS: "ap-opt-check_results",
    CHECK_RUNS: "ap-opt-check_runs",
    CHECK_RUN_ITEMS: "ap-opt-check_run_items",
    APP_SETTINGS: "ap-opt-app_settings",
    RCA_SESSIONS: "ap-opt-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const APO_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const APO_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [APO_TABLE_LEGACY.CHECK_RULES, APO_TABLE.CHECK_RULES],
    [APO_TABLE_LEGACY.CHECK_RESULTS, APO_TABLE.CHECK_RESULTS],
    [APO_TABLE_LEGACY.CHECK_RUNS, APO_TABLE.CHECK_RUNS],
    [APO_TABLE_LEGACY.CHECK_RUN_ITEMS, APO_TABLE.CHECK_RUN_ITEMS],
    [APO_TABLE_LEGACY.APP_SETTINGS, APO_TABLE.APP_SETTINGS],
    [APO_TABLE_LEGACY.RCA_SESSIONS, APO_TABLE.RCA_SESSIONS],
];
