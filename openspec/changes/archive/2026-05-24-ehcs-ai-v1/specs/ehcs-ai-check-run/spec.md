## ADDED Requirements

### Requirement: Start batch check run

The API SHALL create a `check_run` in `running` state and one `check_run_item` per enabled rule in `pending` state when `POST /check-runs` is called.

#### Scenario: Start with enabled rules

- **WHEN** user starts check with N enabled rules
- **THEN** API returns `runId` and N items in pending state

#### Scenario: No enabled rules

- **WHEN** user starts check with zero enabled rules
- **THEN** API returns validation error and no run is created

### Requirement: Ingest per-rule assistant output

`POST /check-runs/:runId/items/:ruleId/ingest` SHALL accept `assistantText` and optional `conversationId`, parse PRD §5.1 JSON, insert or update `check_results`, and set item status to `done` or `failed`.

#### Scenario: Pass with no anomalies

- **WHEN** parsed JSON has `anomalies: []`
- **THEN** item is `done` and no new anomaly rows are created for that rule

#### Scenario: Parse failure

- **WHEN** assistant text has no valid JSON
- **THEN** item is `failed`, no synthetic anomaly is written

#### Scenario: Multiple anomalies

- **WHEN** parsed JSON contains multiple anomaly objects
- **THEN** all are persisted with unique `anomaly_id` values

### Requirement: Complete run when all items terminal

When every item is `done` or `failed`, the run SHALL transition to `completed`.

#### Scenario: All rules processed

- **WHEN** the last item ingest succeeds
- **THEN** run status becomes `completed`

### Requirement: Duplicate check guard

While a run is `running`, the API SHALL reject a second concurrent start unless previous run is cancelled.

#### Scenario: Concurrent start

- **WHEN** a run is already `running`
- **THEN** second `POST /check-runs` returns conflict or validation error
