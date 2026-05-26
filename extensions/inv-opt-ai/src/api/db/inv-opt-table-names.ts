/** PostgreSQL schema for the inv-opt-ai extension (from extension identifier). */
export const INVO_AI_SCHEMA = "inv_opt_ai";

/**
 * INVO-owned table names (schema `inv_opt_ai`).
 * All application tables use the `inv-opt-` prefix for isolation from generic names.
 */
export const INVO_TABLE = {
    CHECK_RULES: "inv-opt-check_rules",
    CHECK_RESULTS: "inv-opt-check_results",
    CHECK_RUNS: "inv-opt-check_runs",
    CHECK_RUN_ITEMS: "inv-opt-check_run_items",
    APP_SETTINGS: "inv-opt-app_settings",
    RCA_SESSIONS: "inv-opt-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const INVO_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const INVO_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [INVO_TABLE_LEGACY.CHECK_RULES, INVO_TABLE.CHECK_RULES],
    [INVO_TABLE_LEGACY.CHECK_RESULTS, INVO_TABLE.CHECK_RESULTS],
    [INVO_TABLE_LEGACY.CHECK_RUNS, INVO_TABLE.CHECK_RUNS],
    [INVO_TABLE_LEGACY.CHECK_RUN_ITEMS, INVO_TABLE.CHECK_RUN_ITEMS],
    [INVO_TABLE_LEGACY.APP_SETTINGS, INVO_TABLE.APP_SETTINGS],
    [INVO_TABLE_LEGACY.RCA_SESSIONS, INVO_TABLE.RCA_SESSIONS],
];
