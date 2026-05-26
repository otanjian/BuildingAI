/** PostgreSQL schema for the asset-life-ai extension (from extension identifier). */
export const AST_AI_SCHEMA = "asset_life_ai";

/**
 * AST-owned table names (schema `asset_life_ai`).
 * All application tables use the `asset-life-` prefix for isolation from generic names.
 */
export const AST_TABLE = {
    CHECK_RULES: "asset-life-check_rules",
    CHECK_RESULTS: "asset-life-check_results",
    CHECK_RUNS: "asset-life-check_runs",
    CHECK_RUN_ITEMS: "asset-life-check_run_items",
    APP_SETTINGS: "asset-life-app_settings",
    RCA_SESSIONS: "asset-life-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const AST_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const AST_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [AST_TABLE_LEGACY.CHECK_RULES, AST_TABLE.CHECK_RULES],
    [AST_TABLE_LEGACY.CHECK_RESULTS, AST_TABLE.CHECK_RESULTS],
    [AST_TABLE_LEGACY.CHECK_RUNS, AST_TABLE.CHECK_RUNS],
    [AST_TABLE_LEGACY.CHECK_RUN_ITEMS, AST_TABLE.CHECK_RUN_ITEMS],
    [AST_TABLE_LEGACY.APP_SETTINGS, AST_TABLE.APP_SETTINGS],
    [AST_TABLE_LEGACY.RCA_SESSIONS, AST_TABLE.RCA_SESSIONS],
];
