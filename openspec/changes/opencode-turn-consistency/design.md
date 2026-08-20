## Context

See `proposal.md` for motivation and `specs/opencode-turn-consistency/spec.md` for behavior. Today the browser HTTP stream, an in-process turn registry, OpenCode's global event stream, conversation JSON metadata, and AI SDK `Chat` instances each own part of the lifecycle. The installed environment uses PostgreSQL and a single local OpenCode 1.17.13 server, but API hot reload or future multi-instance deployment loses the in-process registry. Existing history GET performs synchronous recovery; OpenCode calls have no common timeout; `session.idle` can reach the browser before the assistant message is saved.

Useful existing primitives:

- PostgreSQL transactions, pessimistic locks, partial indexes, and advisory-lock examples already exist in the repository.
- `AppBillingService.deductUserPower` accepts an external `EntityManager`.
- OpenCode exposes `/session/status`, accepts a caller-supplied prompt `messageID`, returns assistant `parentID`, and exposes pending question reply/reject APIs.
- Installed databases upgrade through versioned migrations; adding an entity alone does not update an installed schema.

## Goals / Non-Goals

**Goals:**

- Make PostgreSQL the durable owner of OpenCode turn identity, lifecycle, lease, and commit state.
- Remove browser connection lifetime from remote execution ownership.
- Make dispatch, commit, recovery, stop, and question replies idempotent under retries, restarts, and multiple API instances.
- Preserve reliable progress visibility through durable turn status and last-activity time without OpenCode event connections on the durable path.
- Introduce the new path additively and retain a reversible compatibility projection during rollout.

**Non-Goals:**

- General-purpose job orchestration, Redis/BullMQ, transactional event outbox, or a reusable event gateway.
- OpenCode v2 durable-event migration; the design remains compatible with the currently used endpoints.
- Arbitrary message-tree regeneration. OpenCode regeneration is disabled until branch semantics are specified and tested.
- Worktree/container isolation, permission-policy redesign, SSRF/symlink/iframe hardening, or full OpenCode history mirroring.

## Decisions

### 1. Add one durable turn table and one explicit runtime/session mapping

Add `ai_agent_opencode_turn` with a UUID primary key and these normalized responsibilities:

| Group | Fields |
|---|---|
| Identity | client-generated `id` (also the idempotency key), `conversation_id`, `request_hash` |
| Dispatch | credential-free `dispatch_snapshot`, nullable `artifact_baseline`, `runtime_config_hash` |
| Message links | `input_message_id`, nullable `assistant_message_id`, `opencode_user_message_id` |
| Lifecycle | `status`, `last_activity_at`, terminal `error_code/error_message` |
| Lease/control | `lease_token`, `lease_expires_at`, `cancel_requested_at` |
| Times | `started_at`, `completed_at`, standard created/updated timestamps |

Add nullable `opencode_session_id` and `opencode_runtime_hash` mapping columns on `ai_agent_chat_record`. They are both null or both non-null; the composite mapping is unique because a bare session ID is not assumed globally unique across OpenCode runtimes. `input_message_id` and `assistant_message_id` reference existing Agent messages. Tool and artifact details remain on the committed assistant message rather than being copied onto the turn.

Turn ownership and agent identity are resolved through the conversation rather than duplicated. Because this change keeps one stable OpenCode session per conversation and disables branch regeneration, the turn does not duplicate `opencode_session_id`. Usage and deducted points remain authoritative on the committed assistant/account log rather than being copied onto the turn. The immutable dispatch snapshot contains all credential-free values needed to reproduce dispatch, output projection, and billing: canonical attachment references, effective system instructions, model selection, debug/billing rule, and artifact root. It excludes credentials and duplicated bulk attachment bytes. Attachment references must resolve from persisted input data or fail the turn explicitly. Immediately before first dispatch, the worker persists a compact artifact baseline (relative path plus stat fingerprint); recovery computes it only if the turn has never dispatched. Snapshot/baseline fields are internal, excluded from API DTOs and structured logs, and cleared in every terminal transaction because effective instructions may contain personal parameters. The runtime hash binds the turn to execution-relevant endpoint/workspace configuration so a changed agent configuration cannot silently target an existing session on another runtime.

Required database constraints:

- turn UUID primary-key idempotency plus request-hash/owner verification on duplicate acceptance;
- one active turn per conversation using a partial unique index over `accepted`, `running`, and `committing`;
- unique non-null `(opencode_runtime_hash, opencode_session_id)` conversation mapping and an all-null-or-all-present check;
- unique input, assistant, and remote user message links where non-null;
- one partial unique account-log index for namespaced `opencode-turn:<turnId>` deductions;
- checks for allowed statuses and required terminal timestamps;
- indexes for expired active leases and conversation turn lookup.

The table is intentionally not a generic `agent_turn`: Dify/Coze/native providers have different lifecycle contracts and are outside this capability.

**Alternatives considered:**

- Continue storing status in conversation JSON metadata: rejected because it has no unique constraints, row-level turn identity, or safe concurrent update semantics.
- Use a placeholder assistant message as the turn row: rejected because lifecycle/lease fields would pollute message history and recreate blank-assistant failure modes.
- Reuse the persisted user message as the turn row: rejected because it overloads generic message status with provider execution state, requires many OpenCode-only nullable columns and JSON-role indexes, and makes message deletion a control-plane operation.
- Use only OpenCode session status and no local turn: rejected because history would again depend on OpenCode and local commit, Stop, recovery, and billing would have no idempotency boundary.
- Add generic turn, event, billing-ledger, and outbox tables: rejected as premature platform design. One OpenCode-specific row plus existing messages/account log closes the known failure modes.

### 2. Replace the OpenCode browser stream with command acceptance plus turn status

The client generates UUIDs for a new `conversationId` and every `turnId` before sending. `POST /ai-agents/:agentId/chat/opencode-turns` accepts one current user message plus form inputs, not a browser history array, assistant message, tool approval, or client-selected `parentId`; the server derives linear local linkage from the latest committed turn while OpenCode owns remote context. The durable endpoint also bypasses generic local quick-command replies so every accepted OpenCode user turn has remote correlation; canned local turns can be specified separately if needed. Durable OpenCode sends always persist a conversation, including debug sends. The endpoint returns HTTP 202 with `{ conversationId, turnId, status }` after a short local transaction. `request_hash` covers only the canonical client command plus immutable agent/conversation/owner identity, never mutable server configuration. The transaction first looks up the supplied turn ID: an authorized matching duplicate returns its frozen result without repeating balance/configuration checks; a mismatch is rejected. Only a genuinely new turn performs the existing minimum-point check and builds a validated, credential-free dispatch snapshot. The transaction then creates or validates the supplied conversation, persists the user message, inserts the accepted turn with its snapshot, and updates initial conversation statistics. The active-turn partial index serializes same-conversation acceptance. Remote calls occur only after commit.

The OpenCode-specific client no longer uses an AI SDK `Chat` instance to own the remote request. It submits a command, navigates with the already stable conversation ID after acceptance, loads normal BuildingAI history, and polls `GET /ai-agents/:agentId/chat/opencode-turns/:turnId` while active. The response contains status, timestamps, error, and terminal assistant message ID. Polling is single-flight with bounded backoff; a successful terminal response triggers one history refresh. Stop is a subresource of that exact turn.

The backend execution worker does not subscribe to OpenCode's global event stream. It runs one bounded, non-overlapping observation loop per leased turn using `/session/status`, pending permission/question lists, exact-message reads, and periodically sampled session update time. Idle moves the turn to `committing` but is not sufficient final evidence. In `committing`, a deadline-bounded message-read loop waits for exact completed/error descendants of the stable remote user message, then rebuilds the result, scans final artifacts, and commits. If descendants are not yet visible, the turn remains active for a later lease/retry; it never creates a blank projection. This removes event-schema filtering, reconnect logic, listener accumulation, and browser raw-message access.

**Alternatives considered:**

- Keep the existing AI SDK stream and repair disconnect detection: rejected because it retains two completion channels and provisional Chat identity.
- Build a shared global OpenCode Event Hub with resumable SSE to browsers: valid at larger scale, but substantially more code than durable status polling requires.
- Use browser SSE plus polling fallback: rejected because it caused duplicate connections, overlapping requests, and resource warnings.
- Keep server-side global SSE only: rejected for the minimal path because final results can be reconstructed from correlated messages and the confirmed status endpoint is sufficient for lifecycle observation.

### 3. Treat caller-supplied OpenCode message ID as correlation, not assumed idempotency

Generate a valid OpenCode user message ID once when accepting the turn and persist it before dispatch. Before any dispatch retry, list or retrieve session messages and look for that ID. If present, observe it; if absent after a bounded ambiguity window, send `prompt_async` with the stored ID. Assistant projection includes only messages whose `parentID` equals this ID.

This avoids depending on undocumented duplicate-POST behavior. The first session is created by the lease owner and its returned ID is persisted immediately. Before dispatch or control, the worker verifies that the current credential-free runtime fingerprint still matches the accepted turn and any existing session binding; mismatch becomes a visible failure rather than a request to a potentially unrelated runtime.

The lease token fences database writes but cannot by itself fence an external HTTP call after a process pause. Therefore every mutating OpenCode action (session creation/dispatch, permission reply, question rejection, and abort) uses the same PostgreSQL advisory lock keyed by the BuildingAI conversation, which serializes all turns sharing one remote session. After acquiring it, the worker re-reads the exact turn claim/cancel/runtime state, persists the artifact baseline if this is the first dispatch, then performs at most one operation-deadline-bounded mutation. A later turn cannot dispatch while an old worker still holds this lock. No database transaction is held over the network, and the remote deadline is shorter than the renewable lease. Process death releases the dedicated lock connection; the next owner then waits through the ambiguity window and correlation-checks again. A crash between remote session creation and local mapping can still leave an orphan, and a crash after prompt acceptance but before remote visibility cannot provide mathematical exactly-once delivery because OpenCode exposes no documented idempotency result. These cases are monitored; the local projection remains exactly once and no retry is intentionally sent while the stable message ID is visible.

**Alternative considered:** adopt OpenCode v2 client-assigned session IDs and durable event cursors now. Rejected until the deployed server contract is exercised by compatibility tests; the current change only relies on APIs already confirmed locally.

### 4. Use a small public state machine with database-enforced transitions

Public states are:

```text
accepted -> running -> committing -> completed
accepted/running -> committing -> cancelled
accepted/running/committing -> failed
```

`cancel_requested_at` is a control flag, not another public state, and is exposed only as `cancelRequested` in authorized status. State-changing commands lock the turn row. A freshly generated `lease_token` fences worker writes so an expired worker cannot mutate a turn after another worker claims it. `session.idle` only causes `running -> committing`. A cancellation or timeout remains active until exact remote evidence shows the shared session settled; an ambiguous abort never opens the conversation for another turn. A turn is active until its terminal database transaction commits.

The worker advances `last_activity_at` only when remote evidence changes: status transition, session update time, exact descendant/message change, or a new permission/question request. Re-reading the same `busy` status does not count as activity. After the inactivity threshold, the worker performs one final bounded evidence read and may abort a stale-busy exact session; a `retry` with a future provider deadline remains valid until that deadline plus grace. There is no unconditional wall-clock abort for a productive turn. Pending permissions preserve the existing automatic server policy. A pending question is rejected, the exact session is stopped if needed, and the turn commits a visible unsupported-interaction failure; interactive question state is not part of this capability. A turn stopped before dispatch may enter `committing` without an artifact baseline only when `cancel_requested_at` is present and `started_at` is still null; every other running or committing turn requires the persisted baseline. Every terminal transition clears the lease and `cancel_requested_at` together with the recovery snapshots.

### 5. Commit the terminal outcome in one PostgreSQL transaction

All remote observation and artifact detection finish before opening the commit transaction. The transaction then:

1. pessimistically locks the turn and verifies it is not terminal;
2. inserts one non-blank assistant projection linked to the turn input (success, cancellation, or visible failure outcome);
3. deducts points through `AppBillingService` with the same `EntityManager`, using `opencode-turn:<turnId>` as `associationNo`;
4. stores usage and `userConsumedPower` on the assistant message while the account log remains the deduction source of truth;
5. updates conversation message/token/power statistics without a best-effort catch;
6. stores `assistant_message_id`, clears lease/control plus dispatch snapshot/baseline fields, and marks the turn terminal.

Any error rolls back every step. Retrying locks the same turn; a terminal turn is a no-op. A partial unique account-log index over the `opencode-turn:` namespace independently prevents duplicate deductions; other existing billing associations are unaffected. The billing path must use the supplied `EntityManager` for every query, number generation, and write. This provides exactly-once local behavior without adding a billing ledger or outbox. A transient billing/storage error leaves the turn in `committing` for retry. Insufficient balance is a business-terminal condition: a separate short transaction commits a visible failed billing outcome, exposes no remote answer, and records no deduction.

### 6. Recover expired leases with remote evidence

An in-process fast path starts the accepted turn when the instance has capacity. A small configured per-instance worker pool bounds concurrent observation loops. A periodic reconciler claims no more rows than its free slots from active rows whose lease is absent/expired using `FOR UPDATE SKIP LOCKED`, sets a short renewable lease, and executes the same worker. Excess turns remain claimable by another instance or cycle. This is a database queue, not a second job system or a product-level acceptance quota.

Recovery matrix:

| Local evidence | OpenCode evidence | Action |
|---|---|---|
| accepted, no session | matching runtime binding | create/map session, then correlation-check and dispatch from the persisted snapshot |
| accepted/active | runtime binding mismatch | perform no remote action; commit an explicit configuration-change failure |
| active with missing mapped session | prior local turns exist | do not rebuild context; commit an explicit session-lost failure requiring a new conversation |
| active with session | busy/retry | keep bounded status polling; never abort because the prior process disappeared |
| active with session | pending permission | apply the configured policy to the exact request or fail explicitly |
| active with session | pending question | reject it and commit an explicit unsupported-interaction failure |
| active with session | idle + exact completed descendants | build normal projection and commit |
| active with session | idle + exact unfinished/error descendants | commit explicit failure/cancellation outcome |
| committing | exact descendants not yet readable | keep active and retry within the bounded settle/recovery policy |
| ambiguous dispatch | exact user ID exists | observe without redispatch |
| ambiguous dispatch | exact user ID absent after grace period | dispatch once with stored ID |

History endpoints never invoke this matrix. Stop locks the exact turn and sets `cancel_requested_at` only in `accepted` or `running`; in `committing` or a terminal state it returns the current result without remote action. The lease owner performs the remote abort, observes remote settlement, and only then commits one local cancellation outcome. A retry after an ambiguous abort response may repeat the remote abort call, but the turn remains active and cannot target a newer turn or duplicate local effects. The same settlement rule applies to timeout and unsupported-question aborts.

### 7. Keep the frontend projection deliberately simple

For OpenCode only, the visible surface is:

```text
persisted BuildingAI messages + activity indicator(active turnId)
```

There is never more than one active turn per conversation, so one indicator is sufficient. Its identity is `turnId`, not the latest visible user message. Once `assistantMessageId` is terminal, one history refresh replaces the indicator with persisted content. Conversation list/detail reads join at most one active turn summary (`turnId`, status, and activity time) from PostgreSQL; generating badges and mid-turn reopen use that summary, so no metadata or browser registry is needed to rediscover the turn. Consistency takes priority over token-by-token preview in this change; partial text/tool preview can be added later without changing turn ownership.

The provisional `new-*` Chat rekey path, browser OpenCode event subscription, raw session-message polling, and OpenCode use of `chat.regenerate()` are removed from the new path. Generic/Dify/Coze Chat behavior is unchanged. Regenerate controls are hidden/disabled for OpenCode and the API returns an explicit unsupported response; a future capability can define fork/revert semantics.

Editing, regenerating, or sending from an unverifiable historical branch is disabled for the same reason: BuildingAI's branch tree cannot silently rewrite a linear remote session. Existing ambiguous branches are read-only and require a new conversation. Archiving remains a visibility-only mutation and does not stop an active turn. Soft deletion returns an active-turn conflict until the exact turn is terminal, avoiding a hidden worker commit and charge after deletion.

### 8. Supersede overlapping draft behavior without expanding scope

This change is the consistency source of truth for OpenCode portions of these active changes:

- `opencode-detached-turn`: lifecycle ownership, recovery, Stop, and completion;
- `fix-opencode-background-stream-persist`: user/assistant persist order and generating status;
- `agent-multi-conversation-live-streams`: OpenCode rehydrate and Chat registry behavior only; other providers retain live Chat streams;
- `agent-conversation-background-stream-and-archive`: OpenCode background execution only; archive remains independent;
- `opencode-token-billing`: final usage/deduction semantics, now inside the turn commit;
- `opencode-agent-integration`: deterministic full BuildingAI projection per user turn.
- `opencode-system-role-and-personal-params`: effective system instructions are frozen in the credential-free dispatch snapshot for restart-safe execution.

Their still-valid manual scenarios are migrated into this change's automated/integration verification. Non-OpenCode and archive behavior remains owned by the original capabilities.

## Risks / Trade-offs

- **[Trade-off] No token-by-token browser preview in the durable path** -> Show accepted/running/committing plus last activity, then refresh the complete persisted text/tools/artifacts once; measure user impact before adding a single resumable realtime channel.
- **[Risk] Status polling misses a very fast busy-to-idle transition** -> Require the stable remote user message plus exact terminal descendants, or previously observed busy/retry, before settle; never infer completion from one absent status sample.
- **[Risk] OpenCode remains stale-busy forever** -> Count only changed remote evidence as activity; after the inactivity threshold perform one final check and abort only the exact bound session.
- **[Trade-off] Unconfirmed cancellation keeps a conversation blocked** -> Expose `cancelRequested`, keep retrying bounded abort/status operations, alert on age, and let the user start a new conversation rather than risking two turns in one session.
- **[Risk] A burst creates too many poll loops** -> Bound workers per API instance and claim only free capacity; leave queue depth visible in metrics.
- **[Risk] Remote session creation or prompt dispatch has an ambiguity window** -> Serialize every shared-session mutation with a conversation-scoped PostgreSQL advisory lock, persist mappings immediately, monitor orphan/ambiguity counts, and do not claim unavailable remote exactly-once semantics.
- **[Risk] Long DB transaction during billing** -> Perform no OpenCode/network calls inside commit; lock only the turn and user/account rows needed for the short final transaction.
- **[Risk] Disabling OpenCode Regenerate removes an apparent feature** -> Prefer explicit unavailability over corrupt branch semantics; specify branch regeneration separately after fork/revert behavior is proven.
- **[Risk] Runtime configuration changes during a turn** -> Persist a credential-free fingerprint and dispatch snapshot; fail explicitly instead of sending to a mismatched endpoint/workspace. Credentials remain in agent configuration and are never copied into the turn.
- **[Risk] Two lifecycle paths during rollout** -> Feature-flag by agent, dual-project status to metadata, and never let legacy recovery act on durable turns.
- **[Trade-off] OpenCode-specific turn table duplicates future provider concepts** -> Keeps this repair bounded; generalize only after another provider demonstrates the same lifecycle requirements.

## Migration Plan

1. Add the entity and a versioned, idempotent migration for the turn table, indexes/checks, and explicit conversation session/runtime mapping columns. Deploy with the new path disabled.
2. For metadata sessions whose current runtime and linear message history can be verified, backfill non-conflicting session/runtime mappings. Report duplicate, branched, or otherwise unverifiable bindings instead of guessing; unresolved conversations remain legacy/read-only. Existing completed messages require no turn backfill.
3. Add server integration tests and the worker/reconciler. For durable conversations, compute legacy response fields from the turn join without writing status metadata, and disable mutating history recovery.
4. Add the new client/API path behind an agent-scoped feature flag. Enable it for internal OpenCode agents after legacy active turns have drained.
5. Expand rollout while monitoring active lease age, activity staleness, duplicate request conflicts, commit retries, recovery claims, OpenCode connection count, and charged-turn-without-assistant invariants.
6. After all OpenCode agents use durable turns, remove legacy browser event/raw-message paths and synchronous recovery. Metadata compatibility removal is a later cleanup.

Rollback does not drop schema or turn rows. Disable new acceptance, allow or reconcile active durable turns to terminal, retain the computed compatibility response for old clients, and only then route new sends through the legacy path. Never run both acceptance paths for the same request or active conversation.

## Simplicity Review

| Option | New durable schema | Runtime channels | Failure behavior | Decision |
|---|---:|---:|---|---|
| Patch current HTTP/SSE/metadata path | none | browser stream + browser SSE + polling + server SSE | still lacks atomic commit and restart ownership | rejected |
| OpenCode v2 durable events + generic orchestration/outbox | several generic abstractions | resumable event infrastructure | strongest future platform, unverified deployed contract | defer |
| OpenCode turn + persisted live snapshots | one turn table | server SSE + DB snapshot polling | consistent but update-heavy and more UI state | simplified away |
| **Chosen: OpenCode turn + status polling + final commit** | one turn table plus one explicit conversation mapping | server-to-OpenCode status loop + client-to-BA status loop | closes known races with the fewest owners | chosen |

The remaining turn table is not optional complexity: without it there is no durable place for idempotency, active-turn uniqueness, lease ownership, stale Stop protection, or atomic terminal state. Live-output snapshot persistence, interactive questions, event outbox, Redis, generic provider turns, and live transcript streaming are intentionally excluded.
