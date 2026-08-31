## Purpose

使企业能够从一次请求追溯到身份、租户、Agent 版本、策略、工具、结果和成本，并对异常、预算和服务质量进行实时治理。

## ADDED Requirements

### Requirement: Emit immutable audit events

The system SHALL emit append-only audit events for authentication, resource changes, Agent execution, model calls, retrieval, tool discovery and execution, approvals, releases, exports, deletions, and policy decisions. Events SHALL include verified tenant/project/actor/request context and SHALL avoid unrestricted sensitive payloads.

#### Scenario: Audit a tool execution

- **WHEN** a Tool Gateway execution succeeds or fails
- **THEN** an audit event links the actor, tenant, Agent version, tool version, target, policy decision, approval, outcome, latency, and redacted input/output digests

#### Scenario: Audit a denied request

- **WHEN** a request is denied by authentication or authorization policy
- **THEN** a denial event records the safe reason and policy version without revealing another tenant's resource existence or secrets

### Requirement: Correlate logs, traces, metrics, and usage

The system SHALL propagate request and correlation identifiers across synchronous and asynchronous boundaries, and SHALL expose structured logs, traces, metrics, and usage events that can be joined by tenant, project, Agent version, and operation.

#### Scenario: Trace an asynchronous run

- **WHEN** an automation schedules a Worker job that invokes a model and tool
- **THEN** the schedule, queue, model, tool, delivery, audit, and usage records share a correlation chain

### Requirement: Protect and retain observability data

The system SHALL redact credentials and configured sensitive fields before logs, traces, metrics labels, and audit payloads are persisted. Retention SHALL be configurable by data class and SHALL honor legal hold before deletion. Audit exports SHALL be tamper-evident or append-only at the destination.

#### Scenario: Mask an authorization header

- **WHEN** an HTTP request or tool error contains an Authorization header
- **THEN** observability outputs contain a masked value or digest and never the bearer secret

### Requirement: Enforce hierarchical budget and quota policy

The system SHALL support budgets and quotas at tenant, department, project, Agent, and user scopes, including period, soft limit, hard limit, model/tool allowlists, rate, concurrency, and alert thresholds. Child scopes SHALL NOT exceed active parent hard limits.

#### Scenario: Reject a hard-limit request

- **WHEN** a model request would exceed the applicable hard budget or concurrency quota
- **THEN** the system rejects or applies the configured low-cost/read-only fallback before provider execution and emits a policy event

### Requirement: Reconcile usage and cost idempotently

The system SHALL record usage events for model tokens, tool calls, storage, duration, and provider charges, and SHALL support reservation, settlement, reversal, price-version attribution, idempotency, and reconciliation with account balances.

#### Scenario: Settle a streamed response

- **WHEN** a streamed model response completes after an estimated reservation
- **THEN** the system settles actual usage, releases the difference or records an additional charge, and does not double-charge retries or client replays

#### Scenario: Reconcile a provider invoice

- **WHEN** an operator imports a provider invoice for a billing period
- **THEN** the system can compare invoice totals with usage events by tenant/project/model and reports unexplained differences

### Requirement: Alert on operational and governance anomalies

The system SHALL alert on SLO breaches, queue age, tool failure spikes, cross-tenant denials, unusual secret access, budget anomalies, missing audit events, backup failures, and evaluation regressions according to severity and ownership.

#### Scenario: Detect an audit pipeline outage

- **WHEN** audit events cannot be durably accepted within the configured window
- **THEN** high-risk operations fail closed or enter a bounded quarantine and on-call receives an alert with recovery guidance

### Requirement: Provide authorized observability queries

The system SHALL provide tenant/project-scoped queries for audit events, usage, budget status, alerts, and reconciliation results. Results SHALL be paginated, filtered, redacted, and restricted by the caller's audit/export permissions.

#### Scenario: Query audit history

- **WHEN** an authorized tenant auditor filters tool events by Agent version and time range
- **THEN** the browser/API returns paginated redacted events for that tenant only, including policy decision and correlation ID

#### Scenario: Deny an unauthorized audit export

- **WHEN** a project member without audit-export permission requests another project's audit data
- **THEN** the request is denied without revealing event counts, payloads, or tenant metadata

### Requirement: Verify governance through the browser console

The system SHALL expose a browser dashboard for authorized users to view audit search, usage/cost by tenant/project/Agent, budget utilization, alerts, reconciliation status, and retention state. UI data SHALL match the scoped API and refresh consistently.

#### Scenario: Inspect usage and budget in the browser

- **WHEN** a tenant administrator opens the governance dashboard, filters a seeded period/project, and refreshes
- **THEN** the browser shows matching token/tool/cost totals, budget utilization, threshold status, and correlation links without sensitive payloads

#### Scenario: Trigger and observe a quota denial

- **WHEN** a tester exhausts a seeded project hard limit through the browser test action and retries a request
- **THEN** the UI shows the bounded quota/fallback reason, the usage ledger is idempotent, and the denial appears in audit/alert views

#### Scenario: Verify audit permission isolation

- **WHEN** a read-only member opens the governance route or changes the tenant/project filter to an unauthorized scope
- **THEN** the browser shows forbidden/no-result and never reveals counts or event details from the unauthorized scope
- **AND** the browser's downloaded export and visible network responses contain only the authorized, redacted scope
