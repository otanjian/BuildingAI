/** PostgreSQL schema for the service-sla-ai extension (from extension identifier). */
export const SLA_AI_SCHEMA = "service_sla_ai";

/**
 * SLA-owned table names (schema `service_sla_ai`).
 * All application tables use the `service-sla-` prefix for isolation from generic names.
 */
export const SLA_TABLE = {
    CHECK_RULES: "service-sla-check_rules",
    CHECK_RESULTS: "service-sla-check_results",
    CHECK_RUNS: "service-sla-check_runs",
    CHECK_RUN_ITEMS: "service-sla-check_run_items",
    APP_SETTINGS: "service-sla-app_settings",
    RCA_SESSIONS: "service-sla-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const SLA_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const SLA_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [SLA_TABLE_LEGACY.CHECK_RULES, SLA_TABLE.CHECK_RULES],
    [SLA_TABLE_LEGACY.CHECK_RESULTS, SLA_TABLE.CHECK_RESULTS],
    [SLA_TABLE_LEGACY.CHECK_RUNS, SLA_TABLE.CHECK_RUNS],
    [SLA_TABLE_LEGACY.CHECK_RUN_ITEMS, SLA_TABLE.CHECK_RUN_ITEMS],
    [SLA_TABLE_LEGACY.APP_SETTINGS, SLA_TABLE.APP_SETTINGS],
    [SLA_TABLE_LEGACY.RCA_SESSIONS, SLA_TABLE.RCA_SESSIONS],
];
