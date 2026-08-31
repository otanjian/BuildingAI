## 1. Context and event model

- [x] 1.1 Define request/correlation context and propagate it through API, Agent runtime, queue, Worker, tool, channel, and billing boundaries.
- [x] 1.2 Add audit-event, usage-event, cost-ledger, budget-policy, price-version, and outbox entities with tenant/project/Agent dimensions.
- [x] 1.3 Implement structured redaction and payload digest/reference rules with representative secret and PII fixtures.

## 2. Audit and observability pipeline

- [x] 2.1 Emit audit events for authentication, authorization, Agent/model/retrieval/tool/approval/release/export/delete operations.
- [x] 2.2 Add outbox delivery, append-only persistence, tamper-evident export, OpenTelemetry traces, metrics, and structured log adapters.
- [x] 2.3 Add dashboards and severity-based alerts for SLO, queue, tool, audit, secret-access, backup, budget, and quality anomalies.

## 3. Budget and cost governance

- [x] 3.1 Implement hierarchical budget/quota evaluation for tenant, department, project, Agent, and user scopes.
- [x] 3.2 Implement reserve/settle/reverse accounting, idempotency, price versions, provider usage ingestion, and reconciliation reports.
- [x] 3.3 Add hard-limit rejection, low-cost/read-only fallback, rate/concurrency throttles, alerts, and operator adjustment audit.

## 4. Verification and operations

- [x] 4.1 Add tests for correlation continuity, redaction, audit durability, missing-audit fail-closed behavior, quota inheritance, replay, and reconciliation.
- [x] 4.2 Run load and failure tests for audit/outbox/telemetry backpressure, provider errors, queue recovery, and high-cardinality metrics.
- [x] 4.3 Run typecheck, lint, focused API/Worker tests, dashboard review, backup/restore rehearsal, and cost-ledger month-end dry run.
- [x] 4.4 Using browser control and resettable usage/budget fixtures, verify scoped audit search, pagination/filter/refresh consistency, quota denial/alert, reconciliation and retention status, redacted export, and read-only/cross-tenant denial; API/database checks alone do not close this task.
