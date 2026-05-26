/** PostgreSQL schema for the esg-report-ai extension (from extension identifier). */
export const ESG_AI_SCHEMA = "esg_report_ai";

/**
 * ESG-owned table names (schema `esg_report_ai`).
 * All application tables use the `esg-report-` prefix for isolation from generic names.
 */
export const ESG_TABLE = {
    CHECK_RULES: "esg-report-check_rules",
    CHECK_RESULTS: "esg-report-check_results",
    CHECK_RUNS: "esg-report-check_runs",
    CHECK_RUN_ITEMS: "esg-report-check_run_items",
    APP_SETTINGS: "esg-report-app_settings",
    RCA_SESSIONS: "esg-report-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const ESG_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const ESG_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [ESG_TABLE_LEGACY.CHECK_RULES, ESG_TABLE.CHECK_RULES],
    [ESG_TABLE_LEGACY.CHECK_RESULTS, ESG_TABLE.CHECK_RESULTS],
    [ESG_TABLE_LEGACY.CHECK_RUNS, ESG_TABLE.CHECK_RUNS],
    [ESG_TABLE_LEGACY.CHECK_RUN_ITEMS, ESG_TABLE.CHECK_RUN_ITEMS],
    [ESG_TABLE_LEGACY.APP_SETTINGS, ESG_TABLE.APP_SETTINGS],
    [ESG_TABLE_LEGACY.RCA_SESSIONS, ESG_TABLE.RCA_SESSIONS],
];
