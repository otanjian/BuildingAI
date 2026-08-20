## 1. Schema and turn invariants

- [x] 1.1 Add failing database tests for turn-ID idempotency, one active turn per conversation, unique message links, terminal checks, and unique runtime-bound session mapping
- [x] 1.2 Add the OpenCode turn entity, conversation session/runtime columns, exports, and module registration
- [x] 1.3 Add and test an idempotent versioned migration for turn constraints/indexes plus namespaced OpenCode billing uniqueness
- [x] 1.4 Add a row-locked turn repository/state-transition service with unit tests for every allowed and rejected transition
- [x] 1.5 Add lease repository tests and implementation for claim-token fencing, `SKIP LOCKED` batches, renewal, release, expiry, and two-instance exclusion

## 2. Atomic acceptance and API contracts

- [x] 2.1 Add request/response DTO and authorization tests for client-generated conversation/turn UUIDs, one current user command, rejected browser history/parent overrides, bypassed local quick replies, registered/anonymous ownership, and conflicting ID reuse
- [x] 2.2 Add pure tests for client-command-only request hashing, credential-free execution/billing snapshots, runtime fingerprints, and API/log snapshot redaction
- [x] 2.3 Implement canonical command hashing and snapshot construction, failing explicitly when attachment references or runtime configuration are invalid
- [x] 2.4 Add acceptance transaction tests for minimum-point precheck, duplicate/lost response, changed balance/config, same-conversation concurrency, and setup rollback
- [x] 2.5 Implement the short acceptance transaction and HTTP 202 endpoint with no OpenCode calls before commit
- [x] 2.6 Add shared web-service types and methods for accept, authorized turn status, and turn-scoped Stop contracts

## 3. Bounded OpenCode adapter and mutation serialization

- [x] 3.1 Add adapter tests for operation deadlines, cancellation, `/session/status`, session update time, and bounded exact-message lookup
- [x] 3.2 Implement the tested read APIs with error classification against the currently deployed OpenCode contract
- [x] 3.3 Add adapter tests for automatic permission replies, question rejection, session abort, and stable prompt `messageID`
- [x] 3.4 Implement the tested mutating OpenCode APIs with exact session/request targeting and operation-specific deadlines
- [ ] 3.5 Add correlation/coordinator tests for pre-dispatch baseline persistence/restart, lost response, absent/existing remote user ID, lease expiry, old/new turn contention, and runtime mismatch
- [ ] 3.6 Implement runtime/session mapping, first-dispatch artifact baseline persistence, and all remote mutations through a dedicated conversation-scoped PostgreSQL advisory lock with post-lock exact-claim revalidation

## 4. Turn worker and recovery

- [ ] 4.1 Add worker tests for accepted-to-running execution, single-flight observation, changed-evidence activity, stale-busy timeout, retry deadlines, fast busy-to-idle, and idle-before-message visibility
- [ ] 4.2 Implement bounded status/session/interaction observation plus retryable exact-message settlement in `committing`, without an OpenCode event stream or blank projection
- [ ] 4.3 Add projection tests for exact assistant descendants, non-blank outcomes, tools, usage, sensitive-word filtering, and artifacts changed from the persisted baseline
- [ ] 4.4 Implement exact final-message assembly and final artifact detection from the frozen snapshot and bounded remote reads
- [ ] 4.5 Add recovery-matrix tests for busy/retry, automatic permission handling, question failure, missing mapped session, completed/error descendants, and ambiguous dispatch
- [ ] 4.6 Add worker-pool tests for local capacity, excess queue depth, expired-lease claims, renewal, and graceful process shutdown
- [ ] 4.7 Implement the bounded per-instance worker pool and periodic reconciler without mutating history reads
- [ ] 4.8 Add multi-instance integration tests proving fenced stale workers, serialized shared-session mutations, exact remote targeting, and one local final commit

## 5. Atomic terminal projection and billing

- [ ] 5.1 Add tests proving message, statistics, and billing services use a supplied transaction manager for every query, number generation, and write
- [ ] 5.2 Implement external transaction-manager support and remove best-effort statistic swallowing from the durable commit path
- [ ] 5.3 Add terminal transaction tests for success, namespaced duplicate deduction, rollback, insufficient balance, crash/retry, partial cancellation, and terminal no-op
- [ ] 5.4 Implement the row-locked transaction that saves one assistant, deducts by `opencode-turn:<turnId>`, updates statistics, clears recover-only snapshot fields, and commits the matching terminal state
- [ ] 5.5 Add invariant queries/tests proving every terminal turn has one assistant, no completed billed turn lacks its assistant, and no turn has multiple deductions

## 6. Turn-scoped control and pure history

- [ ] 6.1 Add Stop tests for pre-dispatch, running, committing, ambiguous abort, repeated, terminal, stale, delayed-old-turn, and anonymous-owner requests
- [ ] 6.2 Implement exact-turn cancellation recording, authorized `cancelRequested` status, and lease-owner abort/settlement before terminal cancellation; remove conversation-only abort ownership
- [ ] 6.3 Add interaction tests proving automatic permission handling, exact-session question rejection, duplicate-observation idempotency, and one visible failed outcome
- [ ] 6.4 Add controller tests proving conversation/message GETs perform only BuildingAI reads while OpenCode is slow, unavailable, busy, or waiting on interaction
- [ ] 6.5 Remove synchronous recovery, permission, question, and abort side effects from history GET and route recovery through the reconciler
- [ ] 6.6 Add and implement archive/delete guards proving archive is visibility-only and active-turn deletion is rejected until terminal

## 7. Deterministic OpenCode client

- [ ] 7.1 Add client-store tests for pre-generated IDs, lost HTTP 202 response, single-flight status polling, bounded backoff, one activity indicator, and terminal refresh
- [ ] 7.2 Implement a focused OpenCode turn client/store representing persisted history plus one turn-keyed activity indicator without an AI SDK `Chat` owner
- [ ] 7.3 Add pure BuildingAI conversation list/detail active-turn summaries with API tests for registered, anonymous, archived, and terminal conversations
- [ ] 7.4 Add tests and migrate detail-chat OpenCode send, switch, refresh, generating badge, Stop, and completion behavior to the turn client
- [ ] 7.5 Add tests and migrate site-chat OpenCode behavior to the same client while preserving anonymous ownership headers on every turn endpoint
- [ ] 7.6 Disable OpenCode Regenerate, persisted-message edit, and unverifiable branch-send flows in UI/API with explicit unsupported responses and mutation tests
- [ ] 7.7 Remove the durable OpenCode path's provisional Chat rekey, browser SSE, raw session-message polling, and module-scoped background status ownership

## 8. Compatibility, rollout, and observability

- [ ] 8.1 Add an agent-scoped rollout flag and tests ensuring legacy and durable acceptance cannot both own one request or active conversation
- [ ] 8.2 Add tested migration logic that backfills only verified linear session/runtime mappings and reports branched, duplicate, or unverifiable mappings without guessing
- [ ] 8.3 Add tests and implementation for computed legacy response status from durable turns with no durable status metadata writes
- [ ] 8.4 Add structured logs and metrics for conflicts, lease/activity age, worker capacity/queue depth, status latency, dispatch ambiguity, recovery, commit retry, and billing invariants
- [ ] 8.5 Add migration and rollback tests on an installed-version database snapshot, including restart with active legacy and durable turns
- [ ] 8.6 Reconcile overlapping OpenSpec task lists so OpenCode lifecycle/persistence/billing/rehydrate work is owned here while non-OpenCode/archive scope stays in its original change

## 9. End-to-end verification

- [ ] 9.1 Add API scenarios for first/duplicate send, same-conversation concurrency, A/B parallel conversations, timeout/status failure, and restart in every active state
- [ ] 9.2 Add browser scenarios for new conversation response, refresh/switch mid-turn, indicator replacement, current/old/repeated Stop, billing failure, archive/delete, and disabled branch flows on both chat surfaces
- [ ] 9.3 Run strict OpenSpec validation plus fresh API tests, client tests, lint, typecheck, and production builds under the required Node version
- [ ] 9.4 Run fault injection against `start.sh` services, verify the durable path opens no OpenCode event streams, and execute migrated manual scenarios from related changes
- [ ] 9.5 Enable the durable path for one internal OpenCode agent, verify invariants through real turns and one restart, then document the rollout/rollback decision
