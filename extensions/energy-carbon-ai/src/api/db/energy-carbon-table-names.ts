/** PostgreSQL schema for the energy-carbon-ai extension (from extension identifier). */
export const ECO_AI_SCHEMA = "energy_carbon_ai";

/**
 * ECO-owned table names (schema `energy_carbon_ai`).
 * All application tables use the `energy-carbon-` prefix for isolation from generic names.
 */
export const ECO_TABLE = {
    CHECK_RULES: "energy-carbon-check_rules",
    CHECK_RESULTS: "energy-carbon-check_results",
    CHECK_RUNS: "energy-carbon-check_runs",
    CHECK_RUN_ITEMS: "energy-carbon-check_run_items",
    APP_SETTINGS: "energy-carbon-app_settings",
    RCA_SESSIONS: "energy-carbon-rca_sessions",
} as const;

/** Legacy table names before `0.1.3-rename-tables` migration. */
export const ECO_TABLE_LEGACY = {
    CHECK_RULES: "check_rules",
    CHECK_RESULTS: "check_results",
    CHECK_RUNS: "check_runs",
    CHECK_RUN_ITEMS: "check_run_items",
    APP_SETTINGS: "app_settings",
    RCA_SESSIONS: "rca_sessions",
} as const;

export const ECO_TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    [ECO_TABLE_LEGACY.CHECK_RULES, ECO_TABLE.CHECK_RULES],
    [ECO_TABLE_LEGACY.CHECK_RESULTS, ECO_TABLE.CHECK_RESULTS],
    [ECO_TABLE_LEGACY.CHECK_RUNS, ECO_TABLE.CHECK_RUNS],
    [ECO_TABLE_LEGACY.CHECK_RUN_ITEMS, ECO_TABLE.CHECK_RUN_ITEMS],
    [ECO_TABLE_LEGACY.APP_SETTINGS, ECO_TABLE.APP_SETTINGS],
    [ECO_TABLE_LEGACY.RCA_SESSIONS, ECO_TABLE.RCA_SESSIONS],
];
