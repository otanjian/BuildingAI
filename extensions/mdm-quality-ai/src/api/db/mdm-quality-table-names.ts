/** PostgreSQL schema for the mdm-quality-ai extension (from extension identifier). */
export const MDM_AI_SCHEMA = "mdm_quality_ai";

/**
 * MDM-owned table names (schema `mdm_quality_ai`).
 * All application tables use the `mdm-quality-` prefix for isolation from generic names.
 */
export const MDM_TABLE = {
    CHECK_RULES: "mdm-quality-check_rules",
    CHECK_RESULTS: "mdm-quality-check_results",
    CHECK_RUNS: "mdm-quality-check_runs",
    CHECK_RUN_ITEMS: "mdm-quality-check_run_items",
    APP_SETTINGS: "mdm-quality-app_settings",
    RCA_SESSIONS: "mdm-quality-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const MDM_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const MDM_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [MDM_TABLE_LEGACY.CHECK_RULES, MDM_TABLE.CHECK_RULES],
    [MDM_TABLE_LEGACY.CHECK_RESULTS, MDM_TABLE.CHECK_RESULTS],
    [MDM_TABLE_LEGACY.CHECK_RUNS, MDM_TABLE.CHECK_RUNS],
    [MDM_TABLE_LEGACY.CHECK_RUN_ITEMS, MDM_TABLE.CHECK_RUN_ITEMS],
    [MDM_TABLE_LEGACY.APP_SETTINGS, MDM_TABLE.APP_SETTINGS],
    [MDM_TABLE_LEGACY.RCA_SESSIONS, MDM_TABLE.RCA_SESSIONS],
];
