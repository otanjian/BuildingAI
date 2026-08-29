## 1. Domain and persistence foundations

- [x] 1.1 Define channel-neutral automation/channel-adapter, provider-account, delivery, schedule, policy, run, dispatch, and lifecycle types with documented invariants.
- [x] 1.2 Add `channel_account`, `automation_job`, `automation_run`, and transactional-outbox `automation_dispatch` TypeORM entities with UUID keys, `timestamptz` fields, JSONB metadata, status checks, foreign keys, query indexes, and retention fields.
- [x] 1.3 Add and test a PostgreSQL migration for the automation tables, unique `(job_id, occurrence_key)` and dispatch-key idempotency constraints, lease columns, and rollback-safe indexes.
- [x] 1.4 Implement schedule parsing/calculation for `at`, anchored `every`, and `cron` with IANA timezone validation, DST behavior, minimum interval, maximum catch-up/lookback, and explicit missed-run policies.
- [x] 1.5 Add unit tests covering invalid schedules, DST/timezone boundaries, anchored recurrence without drift, one-shot completion, skipped occurrences, catch-up limits, and retention rules.
- [x] 1.6 Name the automation migration with the current platform semantic version so installed-version startup reconciliation discovers it by migration history name.

## 2. Automation application services

- [x] 2.1 Create the automation module and repository/service boundaries for job management, run history, authorization, and provider registration.
- [x] 2.2 Implement create/list/get/pause/resume/run-once/cancel operations with creator and chat-scope authorization, quotas, prompt limits, and idempotent transitions.
- [x] 2.3 Implement bounded agent invocation using the existing standard-agent public contract, isolated task identity, stable run idempotency identity, optional task conversation reuse, timeout, and safe error/unknown classification.
- [x] 2.4 Persist bounded result/error previews and expose run/task DTOs that never contain channel credentials or unbounded output.
- [x] 2.5 Implement a server-authored unattended tool policy that denies arbitrary shell/code, approval-gated, and high-risk tools unless explicitly pre-authorized; never wait indefinitely for interactive approval.
- [x] 2.6 Add service tests for authorization boundaries, quotas, state transitions, manual-run recurrence preservation, timeout/unknown handling, tool denials, and result persistence.
- [x] 2.7 Add a reusable automation intent DTO/parser and actor-bound pending-confirmation state machine with atomic consume, expiry, cancellation, and confirmation idempotency.
- [x] 2.8 Expose the canonical automation create/search/get/update/pause/resume/run/delete operations through a Bowi MCP provider with principal-bound scope and optimistic concurrency.

## 3. Durable scheduling and queue execution

- [x] 3.1 Register a dedicated BullMQ automation queue and worker without changing existing queues or processors.
- [x] 3.2 Implement the periodic due-task scanner using row locking, `SKIP LOCKED`, deterministic occurrence keys, and transactionally advanced `next_run_at`; record skipped occurrences for audit.
- [x] 3.3 Implement the transactional outbox dispatcher with pending/leased/sent/failed/unknown states, stable dispatch keys and deterministic BullMQ-compatible queue identities, lease expiry recovery, and queue acceptance reconciliation.
- [x] 3.4 Implement worker processing with per-job overlap policy (`skip`, `queue_one`, `allow`), bounded retries/backoff, timeout cancellation, unknown outcomes, and terminal run states.
- [ ] 3.5 Implement restart reconciliation with rate-limited `fire_once`, `skip`, and `catch_up` handling, maximum catch-up count, and lookback window.
- [x] 3.6 Add queue/scanner/outbox/worker tests proving duplicate claims create at most one run, queue hand-off recovery does not create a second run, and retries do not duplicate non-idempotent agent work.

## 4. Extensible channel delivery

- [x] 4.1 Define and register the channel adapter contract for command parsing, interaction replies, target validation, proactive text delivery, optional progressive delivery, capability negotiation, provider account selection, idempotency keys, receipts, and normalized delivered/failed/unknown errors.
- [x] 4.2 Extract shared delivery orchestration from Feishu-specific code so automation execution depends only on the adapter registry.
- [x] 4.3 Implement the Feishu automation adapter with proactive chat/user targeting, provider account/tenant reference, message-size handling, CardKit optional streaming, text fallback, idempotency/deduplication, and credential-safe diagnostics.
- [x] 4.4 Preserve and regression-test existing Feishu inbound interactive chat behavior while adding proactive delivery APIs.
- [ ] 4.5 Add adapter contract tests using a fake provider and Feishu integration tests for success, provider rejection, timeout-after-acceptance unknown, retry, deduplicated failure notification, and fallback paths.
- [x] 4.6 Add provider-neutral external identity binding/derivation so channel-created tasks have stable creator scope and can be mapped to authenticated web creators without exposing other users' tasks.

## 5. Feishu task interaction

- [x] 5.1 Implement a bounded, channel-neutral command parser for `/schedule`, `/tasks`, pause, resume, run, and cancel operations; intercept reserved commands before normal agent forwarding and atomically deduplicate confirmations.
- [x] 5.2 Wire parsed commands into automation authorization and return confirmation messages containing task ID, schedule, timezone, next run, and management hints.
- [x] 5.3 Send scheduled success, failure, timeout, cancellation, and delivery-error notifications to the stored Feishu target, honoring group mention policy, separate failure routes, and one-notification-per-run semantics.
- [ ] 5.4 Add Feishu event tests for command parsing, duplicate events, cross-chat access, bot-authored messages, and unsupported message types.
- [x] 5.5 Add bounded natural-language scheduling for Feishu as a confirmation-gated layer over the same command DTO/service path; never persist an ambiguous preview or let model text choose account/target/tool permissions.
- [x] 5.6 After confirmation, trigger one immediate auditable smoke run with the persisted prompt/policy while preserving the task's recurring next occurrence.
- [x] 5.7 Route explicit natural-language scheduling intents to the automation interceptor before Feishu's `onlyMentioned` group-chat filter, while leaving ordinary unmentioned group messages ignored.
- [x] 5.8 Route Feishu task management through the Bowi MCP automation operations so channels share one persistence boundary.
- [x] 5.9 Resolve the Feishu sender name through the contact API, exact-match `User.nickname`, use the matched user ID for current automation and MCP calls, and leave unmatched/new and existing task identities unchanged.
- [x] 5.10 Add a confirmed web-workspace delete action (including already-cancelled tasks) backed by the canonical automation delete operation, and distinguish `待执行` from `运行中` using the latest run state.

## 6. Console and operations

- [x] 6.1 Add protected read-only console APIs for channel-account/task/run/dispatch listing, detail inspection, and operational status with scope-safe DTOs; keep creator mutations out of console APIs in this release.
- [x] 6.2 Add a separately protected operator recovery API for retry/dismiss of dispatch and unknown delivery without creating a duplicate occurrence.
- [x] 6.3 Add a console task/run view showing schedule, next run, state, recent outcomes, dispatch state, and delivery status without secrets.
- [x] 6.4 Add metrics/logging for due-task lag, run duration, retries, provider errors, delivery failures, unknown states, stale leases, dead letters, and overdue reconciliation.
- [x] 6.5 Document configuration limits, worker deployment requirements, missed-run/overlap policies, unattended tool policy, retention, and the adapter extension contract.
- [x] 6.6 Add scheduler/dispatcher health reporting for runtime inactive state, due-task lag, pending/leased/unknown dispatch counts, stale age, and last reconciliation.

## 7. Verification and rollout

- [ ] 7.1 Run focused automation unit/integration tests and migration validation against PostgreSQL and Redis-backed BullMQ, including crash recovery around the outbox boundary and duplicate create-event delivery (requires external PostgreSQL/Redis runtime).
- [ ] 7.2 Run API typecheck, lint, and build; run client typecheck, lint, and build for console changes (API checks, lint, and build pass; client lint passes with baseline warnings, while client typecheck/build remain blocked by existing workspace dependency/type errors).
- [ ] 7.3 Perform a manual Feishu smoke test covering task creation, restart recovery, proactive delivery, failure retry, and cancellation (requires configured Feishu credentials and reachable provider).
- [x] 7.4 Validate this OpenSpec change, mark completed tasks only after fresh verification, and record rollout/rollback notes.
