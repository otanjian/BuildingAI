/** PostgreSQL schema for the ar-risk-ai extension (from extension identifier). */
export const ARR_AI_SCHEMA = "ar_risk_ai";

/**
 * ARR-owned table names (schema `ar_risk_ai`).
 * All application tables use the `ar-risk-` prefix for isolation from generic names.
 */
export const ARR_TABLE = {
    CHECK_RULES: "ar-risk-check_rules",
    CHECK_RESULTS: "ar-risk-check_results",
    CHECK_RUNS: "ar-risk-check_runs",
    CHECK_RUN_ITEMS: "ar-risk-check_run_items",
    APP_SETTINGS: "ar-risk-app_settings",
    RCA_SESSIONS: "ar-risk-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const ARR_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const ARR_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [ARR_TABLE_LEGACY.CHECK_RULES, ARR_TABLE.CHECK_RULES],
    [ARR_TABLE_LEGACY.CHECK_RESULTS, ARR_TABLE.CHECK_RESULTS],
    [ARR_TABLE_LEGACY.CHECK_RUNS, ARR_TABLE.CHECK_RUNS],
    [ARR_TABLE_LEGACY.CHECK_RUN_ITEMS, ARR_TABLE.CHECK_RUN_ITEMS],
    [ARR_TABLE_LEGACY.APP_SETTINGS, ARR_TABLE.APP_SETTINGS],
    [ARR_TABLE_LEGACY.RCA_SESSIONS, ARR_TABLE.RCA_SESSIONS],
];
