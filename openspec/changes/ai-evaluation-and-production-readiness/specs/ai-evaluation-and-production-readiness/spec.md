## Purpose

为 Agent 和平台运行建立可重复、可对比、可审计的质量与生产准入证据，降低模型、提示词、检索器和工具变更造成的回归风险。

## ADDED Requirements

### Requirement: Manage versioned evaluation datasets

The system SHALL support tenant- or project-scoped evaluation datasets and versioned cases containing inputs, expected outcomes or rubrics, sensitivity tags, tool expectations, and provenance. Restricted cases SHALL be access-controlled and redacted in reports.

#### Scenario: Create an evaluation case

- **WHEN** an authorized evaluator adds a case with a rubric and sensitivity classification
- **THEN** the case is versioned, scoped to the tenant/project, and available only to authorized evaluation runs

### Requirement: Run reproducible Agent evaluations

The system SHALL run an Agent version against a pinned dataset, model/provider configuration, retrieval configuration, tool policy, and evaluator version. Results SHALL include quality, safety, latency, cost, and failure metadata.

#### Scenario: Compare two Agent versions

- **WHEN** an evaluator runs the same pinned dataset against two versions
- **THEN** the system reports comparable per-case and aggregate differences without mixing tenant data or evaluator versions

#### Scenario: Handle an evaluator failure

- **WHEN** a model or evaluator fails transiently during a run
- **THEN** the run records a bounded failure state and can resume or rerun without duplicating final results

### Requirement: Evaluate safety and tool behavior

The system SHALL provide evaluators for groundedness/citation, unauthorized retrieval, prompt injection resilience, PII leakage, refusal quality, tool selection and parameter correctness, approval compliance, and destructive-action denial.

#### Scenario: Detect unauthorized retrieval

- **WHEN** a test case includes content outside the Agent actor's ACL
- **THEN** the evaluation marks any returned restricted content as a safety failure and blocks a required production gate

#### Scenario: Detect approval bypass

- **WHEN** an Agent attempts a high-risk tool without the required approval
- **THEN** the result is recorded as a policy failure even if the external system would have accepted the call

### Requirement: Gate production releases

The system SHALL evaluate configured thresholds for quality, safety, latency, cost, availability evidence, backup readiness, and observability before allowing a version to be promoted to production. Failed gates SHALL explain the metric, threshold, evidence, and remediation or approved exception.

#### Scenario: Block a quality regression

- **WHEN** a candidate version falls below the tenant's groundedness or task-success threshold
- **THEN** production promotion is denied and the release record links the failing cases and baseline comparison

#### Scenario: Approve a compliant release

- **WHEN** all required gates pass and an authorized approver accepts the report
- **THEN** the Agent version becomes eligible for the configured release workflow and the evidence is immutable

### Requirement: Feed production signals back into evaluation

The system SHALL allow authorized operators to convert redacted production failures, user feedback, incidents, and tool-policy violations into tagged regression cases. The system SHALL preserve provenance and avoid storing unrestricted sensitive content.

#### Scenario: Promote an incident to a regression case

- **WHEN** an operator marks a production incident as a reusable regression
- **THEN** a sanitized case is created with incident provenance and is included in future required runs

### Requirement: Verify operational production readiness

The system SHALL provide a checklist and evidence record for SLOs, monitoring, alert ownership, dependency health, queue recovery, backup/restore, disaster recovery, capacity, security tests, secret rotation, and rollback before production activation.

#### Scenario: Reject missing backup evidence

- **WHEN** a candidate production environment has no successful restore rehearsal within the policy window
- **THEN** readiness fails and production activation remains blocked

### Requirement: Ensure evaluation result integrity and statistical context

The system SHALL record evaluator version, model/provider, prompt and retrieval configuration hashes, sample counts, skipped/error cases, confidence or uncertainty indicators where applicable, and baseline identity. A run SHALL NOT be marked passed when required cases are missing or results are stale for the candidate version.

#### Scenario: Reject an incomplete run

- **WHEN** a required safety case is skipped or the run references a different Agent configuration hash
- **THEN** the run is incomplete/invalid and cannot satisfy a production gate

#### Scenario: Compare with a valid baseline

- **WHEN** an evaluator compares a candidate with a pinned baseline and matching dataset/evaluator versions
- **THEN** the report shows sample counts, per-case deltas, uncertainty context, and the exact baseline identity

### Requirement: Operate evaluation and readiness through the browser console

The system SHALL expose an authorized browser evaluation workspace where users can create/import a sanitized dataset, start or resume a run, inspect per-case failures and evidence, approve or reject an exception, and view production-readiness checklist status. The browser SHALL show whether a gate is blocking release.

#### Scenario: Run an evaluation in the browser

- **WHEN** an evaluator opens the evaluation page, selects a seeded Agent version and dataset, starts a run, and refreshes while it progresses
- **THEN** the browser shows run status, progress, sample counts, per-case results, evaluator/version hashes, and final gate status

#### Scenario: Verify a browser gate block

- **WHEN** the tester opens a run with a seeded unauthorized-retrieval or prompt-injection failure
- **THEN** the browser clearly marks the safety gate as blocking, links the failed case, and the release action remains disabled

#### Scenario: Review readiness and exception expiry

- **WHEN** an authorized operator opens readiness, records an allowed time-bounded exception, and later views it after expiry
- **THEN** the UI shows the missing evidence before approval, the exception owner/expiry, and returns the gate to blocked after expiry

#### Scenario: Deny restricted evaluation data

- **WHEN** a user without evaluator permission opens a restricted case or attempts to export its evidence
- **THEN** the browser shows forbidden/redacted content and no case input, expected answer, or sensitive trace is exposed

### Requirement: Isolate evaluation execution from production side effects

The system SHALL run evaluation cases with isolated credentials, network policy, data scope, and tool side-effect controls. Evaluation SHALL NOT mutate production systems or spend unrestricted tenant budget unless an explicitly approved sandbox policy permits it.

#### Scenario: Prevent a production side effect during evaluation

- **WHEN** an evaluation case attempts to call a mutating production tool
- **THEN** the evaluator uses a sandbox/mock or records a policy denial, and no production mutation occurs

#### Scenario: Bound evaluator network access

- **WHEN** an evaluator or LLM judge requests an unapproved external endpoint
- **THEN** the evaluation runner blocks the request and marks the case with a bounded infrastructure/policy result
