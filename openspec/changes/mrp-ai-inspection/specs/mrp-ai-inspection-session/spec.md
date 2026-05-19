## ADDED Requirements

### Requirement: Start AI inspection session

The system SHALL create a `governance_run` with `runType = ai_inspection` and status `RUNNING` when the user starts an inspection from the dashboard with at least one enabled rule.

The run SHALL include `sessionTitle` formatted as `数据检测 YYYY-MM-DD HH:mm:ss` (local server or client time, consistent per session), `executor` (default `AI Agent` or authenticated user id), and `dataSource` default `ERP`.

The API SHALL return `runId`, `sessionTitle`, and the ordered list of `ruleCode` values to inspect.

#### Scenario: Start with enabled rules

- **WHEN** the user clicks **开始检查** with N enabled rules
- **THEN** the system creates one run in `RUNNING` state and returns N rule codes in catalog order

#### Scenario: Reject empty rule set

- **WHEN** the user clicks **开始检查** with zero enabled rules
- **THEN** the system does not create a run and returns a validation error

### Requirement: Complete AI inspection session

The system SHALL transition the run to `COMPLETED` when all expected rule results are persisted, compute `score` and `issueCounts` from rule severities and `failedRecords`, and set `finishedAt`.

#### Scenario: Successful completion

- **WHEN** all enabled rules have a persisted `governance_rule_result` for the run
- **THEN** the run status becomes `COMPLETED` and dashboard summary metrics reflect the new score

#### Scenario: Partial failure still completes run

- **WHEN** one or more rules have `status = failed` but all rules have a result row
- **THEN** the run still completes with score reflecting failed/high-severity counts

### Requirement: Bind platform conversation

The system SHALL allow updating a run with `conversationId` after the platform conversation is discovered.

#### Scenario: Bind conversation id

- **WHEN** the coordinator supplies a valid `conversationId` for an active run
- **THEN** the run record stores `conversationId` for audit and history
