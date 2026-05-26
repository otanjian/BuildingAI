# ehcs-ai-data-model Specification

## Purpose

PostgreSQL schema `ehcs_ai` entities and seeds for rules, results, batch runs, and app settings (`agent_id` binding).
## Requirements
### Requirement: Isolated database schema

All EHCS entities SHALL live in PostgreSQL schema `ehcs_ai`, created via TypeORM migrations.

#### Scenario: Migration applies

- **WHEN** extension migrations run on a fresh database
- **THEN** tables `ehcs-check_rules`, `ehcs-check_results`, `ehcs-check_runs`, `ehcs-check_run_items`, `ehcs-app_settings`, and optional `ehcs-rca_sessions` exist in schema `ehcs_ai`

### Requirement: EHCS table name prefix

All EHCS-owned tables in schema `ehcs_ai` SHALL use the `ehcs-` prefix (e.g. `ehcs-check_rules`). Canonical names: `extensions/ehcs-ai/src/api/db/ehcs-table-names.ts`.

#### Scenario: SQL against extension schema

- **WHEN** agent uses `ehcs_sql_query` with a qualified table reference
- **THEN** statements use quoted identifiers such as `"ehcs_ai"."ehcs-check_rules"`

### Requirement: App settings stores agent id

`ehcs-app_settings` SHALL persist `agent_id` (platform agent UUID) as the only application AI binding field in V1.1.1.

#### Scenario: Settings row

- **WHEN** operator saves settings
- **THEN** `agent_id` references the EHCS platform agent used for chat and batch checks

### Requirement: Check rules entity matches PRD

`ehcs-check_rules` SHALL include: `rule_id`, `business_domain`, `data_item`, `rule_description`, `deduct_score` (1–100), `severity` (高/中/低), `auto_fix`, `enabled`, timestamps.

#### Scenario: Unique rule id

- **WHEN** two rows share the same `rule_id`
- **THEN** the database rejects the duplicate

### Requirement: Check results entity matches PRD

`ehcs-check_results` SHALL include: `anomaly_id`, `rule_id`, `description`, `risk_level`, `root_cause`, `solution`, `status`, `auto_fixed`, `check_time`, `resolved_at`, `create_time`. Canonical column reference: `docs/DB-EHCS-AI.md`.

#### Scenario: Link to rule

- **WHEN** a result references `rule_id`
- **THEN** the rule exists or ingest validation fails before insert

### Requirement: Seed demonstration data

The system SHALL seed at least the three rules and two anomalies from PRD §九 on empty install (or via dedicated seeder).

#### Scenario: Fresh install

- **WHEN** migrations and seeds complete
- **THEN** `RULE_001`, `RULE_004`, `RULE_002` and sample anomalies are queryable

