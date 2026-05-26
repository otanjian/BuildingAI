/** PostgreSQL schema for the project-health-ai extension (from extension identifier). */
export const PRJ_AI_SCHEMA = "project_health_ai";

/**
 * PRJ-owned table names (schema `project_health_ai`).
 * All application tables use the `project-health-` prefix for isolation from generic names.
 */
export const PRJ_TABLE = {
    CHECK_RULES: "project-health-check_rules",
    CHECK_RESULTS: "project-health-check_results",
    CHECK_RUNS: "project-health-check_runs",
    CHECK_RUN_ITEMS: "project-health-check_run_items",
    APP_SETTINGS: "project-health-app_settings",
    RCA_SESSIONS: "project-health-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const PRJ_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const PRJ_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [PRJ_TABLE_LEGACY.CHECK_RULES, PRJ_TABLE.CHECK_RULES],
    [PRJ_TABLE_LEGACY.CHECK_RESULTS, PRJ_TABLE.CHECK_RESULTS],
    [PRJ_TABLE_LEGACY.CHECK_RUNS, PRJ_TABLE.CHECK_RUNS],
    [PRJ_TABLE_LEGACY.CHECK_RUN_ITEMS, PRJ_TABLE.CHECK_RUN_ITEMS],
    [PRJ_TABLE_LEGACY.APP_SETTINGS, PRJ_TABLE.APP_SETTINGS],
    [PRJ_TABLE_LEGACY.RCA_SESSIONS, PRJ_TABLE.RCA_SESSIONS],
];
