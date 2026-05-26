/** PostgreSQL schema for the tax-compliance-ai extension (from extension identifier). */
export const TAX_AI_SCHEMA = "tax_compliance_ai";

/**
 * TAX-owned table names (schema `tax_compliance_ai`).
 * All application tables use the `tax-compliance-` prefix for isolation from generic names.
 */
export const TAX_TABLE = {
    CHECK_RULES: "tax-compliance-check_rules",
    CHECK_RESULTS: "tax-compliance-check_results",
    CHECK_RUNS: "tax-compliance-check_runs",
    CHECK_RUN_ITEMS: "tax-compliance-check_run_items",
    APP_SETTINGS: "tax-compliance-app_settings",
    RCA_SESSIONS: "tax-compliance-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const TAX_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const TAX_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [TAX_TABLE_LEGACY.CHECK_RULES, TAX_TABLE.CHECK_RULES],
    [TAX_TABLE_LEGACY.CHECK_RESULTS, TAX_TABLE.CHECK_RESULTS],
    [TAX_TABLE_LEGACY.CHECK_RUNS, TAX_TABLE.CHECK_RUNS],
    [TAX_TABLE_LEGACY.CHECK_RUN_ITEMS, TAX_TABLE.CHECK_RUN_ITEMS],
    [TAX_TABLE_LEGACY.APP_SETTINGS, TAX_TABLE.APP_SETTINGS],
    [TAX_TABLE_LEGACY.RCA_SESSIONS, TAX_TABLE.RCA_SESSIONS],
];
