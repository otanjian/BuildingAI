/** PostgreSQL schema for the contract-ai extension (from extension identifier). */
export const CTR_AI_SCHEMA = "contract_ai";

/**
 * CTR-owned table names (schema `contract_ai`).
 * All application tables use the `contract-` prefix for isolation from generic names.
 */
export const CTR_TABLE = {
    CHECK_RULES: "contract-check_rules",
    CHECK_RESULTS: "contract-check_results",
    CHECK_RUNS: "contract-check_runs",
    CHECK_RUN_ITEMS: "contract-check_run_items",
    APP_SETTINGS: "contract-app_settings",
    RCA_SESSIONS: "contract-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const CTR_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const CTR_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [CTR_TABLE_LEGACY.CHECK_RULES, CTR_TABLE.CHECK_RULES],
    [CTR_TABLE_LEGACY.CHECK_RESULTS, CTR_TABLE.CHECK_RESULTS],
    [CTR_TABLE_LEGACY.CHECK_RUNS, CTR_TABLE.CHECK_RUNS],
    [CTR_TABLE_LEGACY.CHECK_RUN_ITEMS, CTR_TABLE.CHECK_RUN_ITEMS],
    [CTR_TABLE_LEGACY.APP_SETTINGS, CTR_TABLE.APP_SETTINGS],
    [CTR_TABLE_LEGACY.RCA_SESSIONS, CTR_TABLE.RCA_SESSIONS],
];
