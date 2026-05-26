/** PostgreSQL schema for the channel-inv-ai extension (from extension identifier). */
export const CHI_AI_SCHEMA = "channel_inv_ai";

/**
 * CHI-owned table names (schema `channel_inv_ai`).
 * All application tables use the `channel-inv-` prefix for isolation from generic names.
 */
export const CHI_TABLE = {
    CHECK_RULES: "channel-inv-check_rules",
    CHECK_RESULTS: "channel-inv-check_results",
    CHECK_RUNS: "channel-inv-check_runs",
    CHECK_RUN_ITEMS: "channel-inv-check_run_items",
    APP_SETTINGS: "channel-inv-app_settings",
    RCA_SESSIONS: "channel-inv-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const CHI_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const CHI_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [CHI_TABLE_LEGACY.CHECK_RULES, CHI_TABLE.CHECK_RULES],
    [CHI_TABLE_LEGACY.CHECK_RESULTS, CHI_TABLE.CHECK_RESULTS],
    [CHI_TABLE_LEGACY.CHECK_RUNS, CHI_TABLE.CHECK_RUNS],
    [CHI_TABLE_LEGACY.CHECK_RUN_ITEMS, CHI_TABLE.CHECK_RUN_ITEMS],
    [CHI_TABLE_LEGACY.APP_SETTINGS, CHI_TABLE.APP_SETTINGS],
    [CHI_TABLE_LEGACY.RCA_SESSIONS, CHI_TABLE.RCA_SESSIONS],
];
