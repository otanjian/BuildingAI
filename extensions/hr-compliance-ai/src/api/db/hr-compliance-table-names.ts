/** PostgreSQL schema for the hr-compliance-ai extension (from extension identifier). */
export const HRC_AI_SCHEMA = "hr_compliance_ai";

/**
 * HRC-owned table names (schema `hr_compliance_ai`).
 * All application tables use the `hr-compliance-` prefix for isolation from generic names.
 */
export const HRC_TABLE = {
    CHECK_RULES: "hr-compliance-check_rules",
    CHECK_RESULTS: "hr-compliance-check_results",
    CHECK_RUNS: "hr-compliance-check_runs",
    CHECK_RUN_ITEMS: "hr-compliance-check_run_items",
    APP_SETTINGS: "hr-compliance-app_settings",
    RCA_SESSIONS: "hr-compliance-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const HRC_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const HRC_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [HRC_TABLE_LEGACY.CHECK_RULES, HRC_TABLE.CHECK_RULES],
    [HRC_TABLE_LEGACY.CHECK_RESULTS, HRC_TABLE.CHECK_RESULTS],
    [HRC_TABLE_LEGACY.CHECK_RUNS, HRC_TABLE.CHECK_RUNS],
    [HRC_TABLE_LEGACY.CHECK_RUN_ITEMS, HRC_TABLE.CHECK_RUN_ITEMS],
    [HRC_TABLE_LEGACY.APP_SETTINGS, HRC_TABLE.APP_SETTINGS],
    [HRC_TABLE_LEGACY.RCA_SESSIONS, HRC_TABLE.RCA_SESSIONS],
];
