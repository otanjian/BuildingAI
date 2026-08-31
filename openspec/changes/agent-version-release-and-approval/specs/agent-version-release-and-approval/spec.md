## Purpose

让企业能够以不可变、可审计、可评测和可回滚的版本管理 Agent，从开发草稿安全晋级到生产环境。

## ADDED Requirements

### Requirement: Create immutable Agent versions

The system SHALL create an immutable version snapshot for an Agent containing its model, prompts, tools, datasets, policies, limits, channel bindings, dependency versions, creator, and configuration hash. A published version SHALL NOT be edited in place.

#### Scenario: Create a draft version

- **WHEN** an authorized developer saves an Agent configuration
- **THEN** the system creates or updates a draft snapshot, computes a deterministic hash, and reports the referenced dependencies

#### Scenario: Reject mutation of a published version

- **WHEN** a client attempts to modify a published production version
- **THEN** the system rejects the mutation and requires creation of a new draft version

### Requirement: Promote versions through controlled environments

The system SHALL support environment states for development, test, staging, and production. Promotion SHALL preserve the version hash and dependency snapshot, and SHALL require the checks and approvals configured for the target environment.

#### Scenario: Promote an evaluated version

- **WHEN** a version passes required evaluation and an authorized approver approves promotion to production
- **THEN** the system publishes that exact hash to production and records the approval and release metadata

#### Scenario: Reject a failed promotion

- **WHEN** a version has a failed required evaluation or missing approval
- **THEN** promotion is denied and the current production version remains unchanged

### Requirement: Support staged release and rollback

The system SHALL support a staged release to a bounded tenant, project, percentage, or channel cohort, and SHALL allow an authorized operator to roll back to a previously approved version without editing the version snapshot.

#### Scenario: Canary a version

- **WHEN** an operator starts a canary release for a selected tenant cohort
- **THEN** only that cohort receives the new version, release metrics are separated by version, and the prior version remains available

#### Scenario: Roll back after an incident

- **WHEN** release metrics breach a configured quality, safety, latency, or cost threshold
- **THEN** an authorized operator can switch traffic to the recorded rollback target and the action is audited

### Requirement: Separate content review from production release

The system SHALL maintain marketplace/content review status separately from environment release status. A content-approved Agent SHALL NOT become production-active without the tenant's release checks and approvals.

#### Scenario: Content approval is insufficient

- **WHEN** an Agent is approved for public square display but has no production release approval
- **THEN** it remains unavailable to production execution in the tenant environment

### Requirement: Explain version provenance

The system SHALL expose authorized users with a provenance view showing configuration hash, dependency versions, release note, creator, approver, publisher, timestamps, evaluation evidence, and rollback target.

#### Scenario: Audit a production response

- **WHEN** an auditor inspects a production Agent execution
- **THEN** the system identifies the exact Agent version and provenance metadata used for that execution

### Requirement: Handle concurrent and idempotent releases

The system SHALL require an expected release revision or equivalent concurrency token for publish, pause, cohort change, and rollback operations. Repeating the same operation with the same idempotency key SHALL not create duplicate releases or overwrite a newer production pointer.

#### Scenario: Reject a stale publish

- **WHEN** an operator submits a publish request using a release revision that has already changed
- **THEN** the system rejects the request without changing the production pointer and asks the operator to refresh

#### Scenario: Repeat a rollback command

- **WHEN** the same rollback command is submitted twice with the same idempotency key
- **THEN** the system returns one rollback result and creates one auditable state transition

### Requirement: Verify release lifecycle through the browser console

The system SHALL expose a browser-accessible Agent release workspace where authorized users can create a draft, inspect a config diff and dependency snapshot, submit and approve required gates, start a bounded canary, and roll back. The browser SHALL visibly identify the active version and explain blocked actions.

#### Scenario: Promote an Agent in the browser

- **WHEN** a tester opens the release workspace, creates a draft change, views the diff, submits it, and an approver approves all required gates
- **THEN** the browser shows the version as eligible/published for the selected environment, the hash and approver are visible, and refreshing preserves the state
- **AND** the browser does not expose credential values contained by any dependency reference

#### Scenario: Verify browser canary and rollback

- **WHEN** the tester starts a canary for a seeded test cohort and then triggers rollback from the browser
- **THEN** the UI shows the cohort scope, active version changes back to the recorded target, no unrelated cohort changes, and release/audit history contains both transitions

#### Scenario: Explain a blocked browser action

- **WHEN** a user without approval permission or with a failed evaluation opens the release page
- **THEN** publish/rollback controls are disabled or rejected with the missing permission/gate reason and no state changes
