## 1. Version and release model

- [x] 1.1 Add Agent-version, release, approval, dependency-lock, and cohort entities with immutable snapshot and hash fields.
- [x] 1.2 Implement canonical snapshot normalization, hash generation, diff, provenance, and sensitive-field redaction.
- [x] 1.3 Generate and reconcile v1 snapshots for legacy Agents without changing their current runtime behavior.

## 2. Lifecycle and runtime integration

- [x] 2.1 Implement draft, submit, evaluate-gate, approve, publish, canary, pause, rollback, and archive service transitions.
- [x] 2.2 Add a centralized version resolver and migrate chat, automation, channel, and public execution paths to it.
- [x] 2.3 Convert legacy update/publish APIs to create drafts or return migration-safe errors; prevent in-place production mutation.

## 3. Console and audit

- [x] 3.1 Add version history, config diff, dependency view, release cohort, approval, and rollback actions to the management API/client.
- [x] 3.2 Record creator, approver, publisher, hash, evaluation evidence, traffic cohort, and rollback events in audit records.
- [x] 3.3 Separate marketplace content-review status from tenant environment release status in API responses and UI labels.

## 4. Verification and rollout

- [x] 4.1 Add tests for immutable versions, failed gates, missing approvals, dependency deletion, canary isolation, and rollback.
- [x] 4.2 Run legacy-vs-versioned shadow comparisons for representative Agent types and channels.
- [x] 4.3 Run typecheck, lint, focused API/client tests, migration rehearsal, and release rollback drill.
- [x] 4.4 Using browser control and resettable sandbox Agent data, verify draft/diff/dependencies, submit/approve, failed gate, canary cohort, active version, stale revision, idempotent rollback, refresh persistence, and blocked-action reasons; API tests alone do not close this task.
