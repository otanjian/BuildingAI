## 1. Evaluation data and runner

- [x] 1.1 Add tenant/project-scoped evaluation dataset, case, version, run, result, evaluator, and gate-evidence entities.
- [x] 1.2 Implement sanitized case import, sensitivity/ACL controls, deterministic dataset snapshots, and provenance metadata.
- [x] 1.3 Implement a reproducible runner pinning Agent version, model, retrieval, tool policy, evaluator version, and seed/configuration.

## 2. Quality and safety evaluators

- [x] 2.1 Implement groundedness/citation, task success, refusal quality, latency, cost, and structured-output evaluators.
- [x] 2.2 Implement unauthorized retrieval, prompt injection, PII leakage, tool selection/parameter, approval-bypass, and destructive-action evaluators.
- [x] 2.3 Add per-case results, aggregate comparison, failure clustering, evidence redaction, and report export APIs.

## 3. Production gates and feedback

- [x] 3.1 Implement configurable quality/safety/latency/cost thresholds, hard safety blocks, exception expiry, and immutable gate evidence.
- [x] 3.2 Integrate gate results with Agent release promotion, canary pause/rollback, audit, usage, and cost governance.
- [x] 3.3 Add sanitized production feedback/incident-to-regression workflow with provenance and review state.

## 4. Readiness and verification

- [x] 4.1 Add readiness checks for SLO, observability, dependency health, queue recovery, backup restore, DR, capacity, security, rotation, and rollback.
- [x] 4.2 Create a pilot golden/red-team set and run baseline, regression, failure-injection, and report reproducibility tests.
- [x] 4.3 Run typecheck, lint, focused runner/API tests, release-gate integration tests, and production-readiness rehearsal.
- [x] 4.4 Using browser control in an isolated evaluator sandbox, verify sanitized dataset/run creation, progress/resume, incomplete-run rejection, per-case safety failure, gate block/pass, readiness missing evidence, exception expiry, restricted-case denial, side-effect/network isolation, and refresh consistency; direct API/database changes do not close this task.
