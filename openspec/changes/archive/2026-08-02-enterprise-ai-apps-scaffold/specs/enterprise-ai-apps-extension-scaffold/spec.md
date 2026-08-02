## ADDED Requirements

### Requirement: Extension cloned from ehcs-ai template

For each `appId` in the enterprise registry, the system SHALL provide an extension under `extensions/{appId}/` structurally equivalent to `extensions/ehcs-ai`, including API modules (dashboard, rules, anomalies, check-runs, settings, MCP), Web routes (`/dashboard`, `/rules`, `/anomalies`, `/settings`), and six TypeORM entities in an isolated PostgreSQL schema.

#### Scenario: Developer builds extension

- **WHEN** running `pnpm --filter {appId} build:publish`
- **THEN** the extension produces API and web artifacts without referencing `ehcs-` table names or `ehcs_` MCP tool names

### Requirement: Per-app naming conventions

Table names SHALL use the registry `tablePrefix` (e.g. `inv-opt-check_rules`). MCP tools SHALL use snake_case derived from the prefix (e.g. `inv_opt_start_full_check`). Console API routes SHALL be rooted at `/extension/{appId}/console/`.

#### Scenario: SQL and MCP isolation

- **WHEN** an agent calls `{mcp_prefix}_sql_query`
- **THEN** only the application's schema (e.g. `inv_opt_ai`) is accessible
- **AND** no query targets `ehcs_ai` unless explicitly cross-app (forbidden)

### Requirement: Application entry URLs

Users SHALL access each app via `/apps/{appId}` (platform shell) and `/extension/{appId}` (direct extension UI), matching EHCS entry behavior.

#### Scenario: Navigation to inventory app

- **WHEN** a user opens `/apps/inv-opt-ai`
- **THEN** the extension UI loads with top navigation and optional agent dock per PRD
