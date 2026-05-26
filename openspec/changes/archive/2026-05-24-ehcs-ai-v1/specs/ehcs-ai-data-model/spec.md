## ADDED Requirements

### Requirement: Isolated database schema

All EHCS entities SHALL live in PostgreSQL schema `ehcs_ai`, created via TypeORM migrations.

#### Scenario: Migration applies

- **WHEN** extension migrations run on a fresh database
- **THEN** tables `check_rules`, `check_results`, `check_runs`, `check_run_items`, and `app_settings` exist in schema `ehcs_ai`

### Requirement: Check rules entity matches PRD

`check_rules` SHALL include: `rule_id`, `business_domain`, `data_item`, `rule_description`, `deduct_score` (1–100), `severity` (高/中/低), `auto_fix`, `enabled`, timestamps.

#### Scenario: Unique rule id

- **WHEN** two rows share the same `rule_id`
- **THEN** the database rejects the duplicate

### Requirement: Check results entity matches PRD

`check_results` SHALL include: `anomaly_id`, `rule_id`, `description`, `risk_level`, `root_cause`, `solution`, `status`, `auto_fixed`, `check_time`, `create_time`.

#### Scenario: Link to rule

- **WHEN** a result references `rule_id`
- **THEN** the rule exists or ingest validation fails before insert

### Requirement: Seed demonstration data

The system SHALL seed at least the three rules and two anomalies from PRD §九 on empty install (or via dedicated seeder).

#### Scenario: Fresh install

- **WHEN** migrations and seeds complete
- **THEN** `RULE_001`, `RULE_004`, `RULE_002` and sample anomalies are queryable
