/** PostgreSQL schema for the budget-control-ai extension (from extension identifier). */
export const BDG_AI_SCHEMA = "budget_control_ai";

/**
 * BDG-owned table names (schema `budget_control_ai`).
 * All application tables use the `budget-control-` prefix for isolation from generic names.
 */
export const BDG_TABLE = {
    CHECK_RULES: "budget-control-check_rules",
    CHECK_RESULTS: "budget-control-check_results",
    CHECK_RUNS: "budget-control-check_runs",
    CHECK_RUN_ITEMS: "budget-control-check_run_items",
    APP_SETTINGS: "budget-control-app_settings",
    RCA_SESSIONS: "budget-control-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const BDG_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const BDG_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [BDG_TABLE_LEGACY.CHECK_RULES, BDG_TABLE.CHECK_RULES],
    [BDG_TABLE_LEGACY.CHECK_RESULTS, BDG_TABLE.CHECK_RESULTS],
    [BDG_TABLE_LEGACY.CHECK_RUNS, BDG_TABLE.CHECK_RUNS],
    [BDG_TABLE_LEGACY.CHECK_RUN_ITEMS, BDG_TABLE.CHECK_RUN_ITEMS],
    [BDG_TABLE_LEGACY.APP_SETTINGS, BDG_TABLE.APP_SETTINGS],
    [BDG_TABLE_LEGACY.RCA_SESSIONS, BDG_TABLE.RCA_SESSIONS],
];
