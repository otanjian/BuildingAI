## ADDED Requirements

### Requirement: Persist per-rule inspection result

The system SHALL accept a structured rule result for an `ai_inspection` run and store one `governance_rule_result` row per `ruleCode`, including `totalRecords`, `failedRecords`, `passRate`, `summary`, `conclusion`, `suggestion`, and `status` (`completed` or `failed`).

Rule metadata (`module`, `ruleDescription`, severity) SHALL be derived from the rule catalog.

#### Scenario: Persist successful parse

- **WHEN** the coordinator posts a valid payload matching the inspection JSON schema for `ruleCode` R
- **THEN** a rule result row exists for run and R with `status = completed` and counts populated

#### Scenario: Persist parse failure

- **WHEN** the coordinator posts a failure payload with `rawAssistantText` and no valid details
- **THEN** a rule result row exists with `status = failed` and `conclusion` indicating check failure

### Requirement: Persist exception details

The system SHALL store zero or more `governance_check_detail` rows per rule result from the `details` array (`docType`, `docCode`, `docName`, `fieldName`, `currentValue`, `expectedValue`, `additionalInfo`).

#### Scenario: Multiple exceptions

- **WHEN** the payload includes 21 detail rows
- **THEN** 21 detail rows are linked to the rule result

#### Scenario: Pass with no exceptions

- **WHEN** `failedRecords` is 0 and `details` is empty
- **THEN** the rule result is stored with zero detail rows and `conclusion` indicates pass

### Requirement: Idempotent rule upsert

The system SHALL upsert by `(runId, ruleCode)` so retries from the coordinator do not duplicate rows.

#### Scenario: Duplicate post

- **WHEN** the coordinator posts the same `ruleCode` twice for one run
- **THEN** only one rule result row remains (latest wins) and details are replaced
