/** PostgreSQL schema for the proc-audit-ai extension (from extension identifier). */
export const PROC_AI_SCHEMA = "proc_audit_ai";

/**
 * PROC-owned table names (schema `proc_audit_ai`).
 * All application tables use the `proc-audit-` prefix for isolation from generic names.
 */
export const PROC_TABLE = {
    CHECK_RULES: "proc-audit-check_rules",
    CHECK_RESULTS: "proc-audit-check_results",
    CHECK_RUNS: "proc-audit-check_runs",
    CHECK_RUN_ITEMS: "proc-audit-check_run_items",
    APP_SETTINGS: "proc-audit-app_settings",
    RCA_SESSIONS: "proc-audit-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const PROC_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const PROC_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [PROC_TABLE_LEGACY.CHECK_RULES, PROC_TABLE.CHECK_RULES],
    [PROC_TABLE_LEGACY.CHECK_RESULTS, PROC_TABLE.CHECK_RESULTS],
    [PROC_TABLE_LEGACY.CHECK_RUNS, PROC_TABLE.CHECK_RUNS],
    [PROC_TABLE_LEGACY.CHECK_RUN_ITEMS, PROC_TABLE.CHECK_RUN_ITEMS],
    [PROC_TABLE_LEGACY.APP_SETTINGS, PROC_TABLE.APP_SETTINGS],
    [PROC_TABLE_LEGACY.RCA_SESSIONS, PROC_TABLE.RCA_SESSIONS],
];
