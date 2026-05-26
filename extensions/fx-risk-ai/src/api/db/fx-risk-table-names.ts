/** PostgreSQL schema for the fx-risk-ai extension (from extension identifier). */
export const FXR_AI_SCHEMA = "fx_risk_ai";

/**
 * FXR-owned table names (schema `fx_risk_ai`).
 * All application tables use the `fx-risk-` prefix for isolation from generic names.
 */
export const FXR_TABLE = {
    CHECK_RULES: "fx-risk-check_rules",
    CHECK_RESULTS: "fx-risk-check_results",
    CHECK_RUNS: "fx-risk-check_runs",
    CHECK_RUN_ITEMS: "fx-risk-check_run_items",
    APP_SETTINGS: "fx-risk-app_settings",
    RCA_SESSIONS: "fx-risk-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const FXR_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const FXR_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [FXR_TABLE_LEGACY.CHECK_RULES, FXR_TABLE.CHECK_RULES],
    [FXR_TABLE_LEGACY.CHECK_RESULTS, FXR_TABLE.CHECK_RESULTS],
    [FXR_TABLE_LEGACY.CHECK_RUNS, FXR_TABLE.CHECK_RUNS],
    [FXR_TABLE_LEGACY.CHECK_RUN_ITEMS, FXR_TABLE.CHECK_RUN_ITEMS],
    [FXR_TABLE_LEGACY.APP_SETTINGS, FXR_TABLE.APP_SETTINGS],
    [FXR_TABLE_LEGACY.RCA_SESSIONS, FXR_TABLE.RCA_SESSIONS],
];
