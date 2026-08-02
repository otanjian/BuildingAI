## ADDED Requirements

### Requirement: Sample anomalies on empty database

Each enterprise extension SHALL provide an `AiDataSeeder` (or equivalent) that inserts at least two sample rows into `{prefix}-check_results` when the results table is empty, using anomaly IDs and rule IDs consistent with that application's PRD appendix and catalog prefixes.

#### Scenario: Fresh schema seed

- **WHEN** extension seed runs on an empty `check_results` table
- **THEN** at least two anomalies exist with statuses `待解决` and optionally `ai自动修复`
- **AND** each anomaly references a valid `rule_id` from that application's catalog

### Requirement: Sample data idempotency

Demo seeders MUST NOT duplicate anomalies on repeated seed runs when results already exist.

#### Scenario: Re-run seed

- **WHEN** seed runs twice without truncating results
- **THEN** the anomaly count does not increase on the second run

### Requirement: Dashboard demonstrability

Seeded anomalies SHALL include `check_time`, `risk_level`, `description`, `root_cause`, and `solution` fields sufficient to render the anomalies list and dashboard recent-anomalies table without manual ingest.

#### Scenario: Dashboard shows samples

- **WHEN** a user opens the dashboard after initial seed
- **THEN** recent anomalies table displays seeded rows without running a full check
