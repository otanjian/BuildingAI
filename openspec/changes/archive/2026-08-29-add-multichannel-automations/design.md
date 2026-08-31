## Context

The existing Feishu integration owns a process-local long connection and invokes the published
standard-agent chat API. Static NestJS cron jobs and a Redis-backed BullMQ foundation exist, but
there is no durable user-created task or proactive channel delivery abstraction. The design must
preserve the existing interactive Feishu path while allowing future DingTalk and WeCom adapters to
plug into the same automation lifecycle.

## Goals / Non-Goals

**Goals:**

- Make task definitions and run history durable across restarts.
- Separate schedule calculation, execution, authorization, and channel delivery.
- Support Feishu in this release with a stable adapter boundary for future channels.
- Provide atomic claiming, idempotent management, retries, timeouts, and missed-run handling.
- Make queue dispatch durable with an outbox/dispatcher protocol and observable recovery states.
- Distinguish agent execution outcome from delivery outcome, including unknown delivery after a
  provider timeout.
- Prevent unattended runs from hanging on approvals or gaining the interactive chat's full tool
  permissions.

**Non-Goals:**

- Implement DingTalk or WeCom adapters now.
- Accept arbitrary commands, scripts, or code as scheduled payloads.
- Replace the existing Feishu long-connection transport.

## Decisions

### Domain boundaries

Create an `automation` module with five ports: `ScheduleCalculator`, `AutomationExecutor`,
`AutomationChannelAdapter`, `AutomationAuthorization`, and `AutomationToolPolicy`. The scheduler
only creates due runs and advances occurrences; the executor invokes a standard agent; the channel
adapter owns provider APIs and maps canonical interaction/target envelopes; authorization is
evaluated using creator, tenant/account, agent, channel, and target context; the tool policy creates
an explicit unattended-run capability envelope. A future DingTalk or WeCom implementation supplies
an adapter and account configuration without adding provider branches to the scheduler.

### Durable storage

Add PostgreSQL `channel_account`, `automation_job`, `automation_run`, and `automation_dispatch`
entities with UUID primary keys, `timestamptz` columns, text status/kind fields, JSONB policy and
delivery metadata, and explicit foreign-key indexes. `channel_account` is the provider-neutral
account/tenant registry; credentials remain in a secret reference managed by the channel integration.
A unique constraint on `(job_id, occurrence_key)` is the logical
idempotency fence. `automation_dispatch` is a transactional outbox row with a stable dispatch key,
state (`pending`, `leased`, `sent`, `failed`, `unknown`), lease/attempt metadata, and last error. It
is the durable hand-off between the database scheduler and BullMQ; a recovery loop republishes
pending or expired leases. Keep provider secrets in the existing channel configuration store; task
rows contain only a provider key/account reference and opaque target metadata.

`automation_job` stores schedule definition, normalized timezone, prompt, creator scope, selected
agent, channel type, `channel_account_id`, immutable delivery-target snapshot, enabled
state, next run, missed-run policy, timeout, retry policy, overlap policy, unattended tool policy,
delivery policy, and delete-after-run. Provider account references are opaque and never contain
credentials; the first Feishu release may enforce one account per agent while preserving the field.
`automation_run` stores occurrence, lifecycle timestamps, attempt, conversation ID, bounded result
preview, error preview, and delivery status/message ID. Large answers are retained through the
existing artifact/report mechanism or a bounded preview policy rather than unbounded run rows.

### Scheduling and claiming

Use a small periodic scanner (for example every 5 seconds) to find enabled jobs with
`next_run_at <= now()`. Within a short database transaction, lock rows with `FOR UPDATE SKIP LOCKED`,
insert the unique occurrence run and a pending outbox row, compute the next occurrence in the task
timezone, and advance the job. Commit before publishing to a dedicated BullMQ `automation` queue.
An outbox dispatcher publishes the stable dispatch key, marks it sent only after queue acceptance, and
retries/reconciles pending, failed, or expired leases. A unique occurrence constraint plus
deterministic occurrence and dispatch keys protects against enqueue retries and multiple API
instances. The `every` schedule is anchored to a persisted timeline rather than completion time, so
a slow run does not silently drift the schedule. Worker concurrency is bounded and an explicit
overlap policy (`skip`, `queue_one`, or `allow`) controls per-job concurrent runs; default is `skip`.
When `skip` applies, the skipped occurrence is still recorded for audit.

On startup, overdue jobs use their persisted missed-run policy (`fire_once`, `skip`, or `catch_up`)
with a configurable maximum catch-up count and lookback window. Startup catch-up is rate-limited so
it cannot flood the provider or model. If a run is claimed but its worker result is unknown,
reconciliation does not blindly replay it; it marks the run/dispatch unknown and requires
policy-driven retry or operator action. One-shot jobs are disabled or deleted only after successful
execution and required delivery according to the configured policy.

### Agent invocation and isolation

The executor uses a server-side agent invocation port. It may reuse the published-agent transport
only when an internal execution context can enforce the same policy; otherwise it calls the existing
application service directly. Client-supplied tool permissions are never trusted. Each task defaults
to an isolated anonymous identity derived from `(agent_id, job_id)` and may optionally keep a task
conversation ID for recurring context. It uses a hard timeout, bounded response size, and safe error
classification. Each attempt carries a stable run identity/idempotency key. Failures before
upstream acceptance may be retried; a timeout after work may have started is `unknown` and is not
automatically replayed unless the upstream contract proves idempotency. The executor receives a
server-authored unattended tool policy: high-risk tools, arbitrary shell/code execution, external
side effects, and approval-gated tools are denied or require an explicit pre-authorized capability.
An interactive Feishu turn never leaks its broader tool policy into a scheduled run, and a scheduled
run never waits indefinitely for interactive approval.

### Channel-neutral channel and delivery adapter

Define a provider registry keyed by a stable channel type plus `channel_account` identity. The
adapter receives a canonical interaction envelope (`actor`, `conversation`, `target`, `rawEventId`)
and exposes methods conceptually equivalent to:

```ts
parseAutomationCommand?(envelope): AutomationCommand | undefined
replyToInteraction(context, content): Promise<DeliveryReceipt>
validateTarget(context): Promise<ValidatedTarget>
sendText(context, content, idempotencyKey): Promise<DeliveryReceipt>
beginProgressive?(context, initial, idempotencyKey): Promise<ProgressiveDelivery>
sendFailure?(context, summary, idempotencyKey): Promise<DeliveryReceipt>
```

The adapter contract MUST classify delivery as `delivered`, `failed`, or `unknown`; a network timeout
after provider acceptance is not equivalent to a safe failure. Adapters must support an idempotency
key where the provider permits it, and the core must suppress duplicate sends where it does not. The
outbox dispatcher MUST derive a deterministic BullMQ-compatible queue job identity from the stable
dispatch key (the canonical key remains in the database); if marking the outbox row sent fails after
Redis accepts the job, republishing the same key MUST resolve to the existing queue job rather than
creating another one. The
Feishu adapter maps `chat_id`/user targets to proactive `im.v1.message.create` calls and may use
CardKit when supported. It must not depend on an inbound message ID for scheduled delivery. The
inbound command path intercepts reserved automation commands before normal agent forwarding and
uses an atomic event key to avoid duplicate confirmations. Future DingTalk and WeCom adapters
implement the same port and own only their SDK/webhook/token details.

### User interaction and administration

Expose one channel-neutral `automations` capability with operations equivalent to `create`, `list`,
`get`, `pause`, `resume`, `run`, and `cancel`. Explicit Feishu commands and bounded natural-language
input both compile to the same command DTO; the adapter never writes tasks directly. Natural-language
input produces a normalized preview (schedule, timezone, prompt, target, policy, and next run) and
stores a short-lived, actor/account/tenant/conversation-bound pending confirmation. Only an explicit
confirmation can consume that state and call the automation service. Confirmation consumption is
atomic and idempotent; an expired, cancelled, or mismatched confirmation cannot create a task.
Ambiguous input asks for the missing fields and is never persisted as a job.

The service derives the delivery target, provider account, creator identity, and unattended tool
policy from the authenticated channel envelope. Model text cannot select an arbitrary external ID,
credential, or tool allowlist. Each adapter maps `(provider, account, tenant, external actor)` to a
local creator when a verified binding exists; otherwise a stable provider-scoped external identity is
used. For the first Feishu path, the adapter fetches the sender's display name from the Feishu contact
API and exact-matches it against `User.nickname`; a match supplies the local user ID for the current
interaction and MCP invocation. This intentionally does not add a binding table, resolve duplicate
names, or migrate existing task creator IDs; unmatched senders retain the existing provider-scoped
identity. In addition to the channel creator scope, the owner of the selected agent has a separate
workspace-management scope: an agent owner may inspect and manage tasks delivered by that agent,
while channel users continue to see only tasks created by their own external identity. This makes
tasks created from an owned Feishu bot visible in the web workspace without allowing a task from one
local user's agent to leak into another user's workspace, and gives future DingTalk/WeCom adapters the
same identity and command contracts.

After confirmation, the service persists the task and enqueues one immediate smoke run using the same
prompt, target, and unattended policy. The smoke run is auditable and does not change the recurring
next occurrence; a one-shot task is only terminal after execution and required delivery succeed.

The first console surface is read-only for job/run/outbox inspection; recovery actions are exposed
only through a separately protected operator path and never through ordinary creator-scoped task
APIs. No provider secret is exposed. The authenticated web workspace also exposes a creator/agent-
owner-scoped task list directly below the `新对话` entry. It uses the same authorization and lifecycle
APIs as channel commands, shows only bounded task/run status, and does not become a second task
persistence path. Task creation continues to be confirmation-gated in the originating channel for
this release.

### Bowi MCP management boundary

All creator-facing automation mutations and reads are exposed through the canonical `bowi-mcp`
provider as `automation_*` tools. The provider is an application-facing anti-corruption layer: it
derives the caller from the verified Bowi principal, validates arguments and optimistic-concurrency
versions, and delegates to `AutomationService` for the single PostgreSQL persistence path. Feishu
commands and future DingTalk/WeCom command adapters call the same provider operations locally after
their channel confirmation flow; they must not write `automation_job` directly. The scheduler and
worker remain internal infrastructure and use the service's transactional claim/execute methods,
not a recursive MCP network call.

The minimum stable tool set is `automation_create`, `automation_search`, `automation_get`,
`automation_update`, `automation_pause`, `automation_resume`, `automation_run`, and
`automation_delete`. Tool schemas deliberately omit creator, credentials, and arbitrary tool-policy
fields. A creator principal is required for every operation. Creation additionally requires a
signed channel scope (channel account, conversation, and delivery target); without that scope the
provider fails closed instead of allowing a model to invent an external destination. Update and
delete use `expectedUpdatedAt` when supplied and return a conflict on stale writes. Delete is a
soft terminal transition so run history and delivery audit remain recoverable.

The authenticated web workspace presents this canonical delete operation as a destructive, confirmed
delete action, including for tasks already marked cancelled; the operation remains idempotent and
retains audit history. Task-card status is derived from lifecycle plus the latest run: an active task is
`待执行` while waiting for its next occurrence and becomes `运行中` only while a run is actually
executing. Terminal and paused lifecycle states remain explicit so operators can distinguish them
from a schedulable task.

### Reliability and security

Use atomic state transitions for management, unique run/dispatch keys, retry/backoff for transient
agent and delivery failures, and terminal states for permanent failures. Record delivery separately
from agent execution so an answer is not lost when Feishu is unavailable. Enforce creator/tenant/chat
scope, agent availability, per-user and per-tenant quotas, minimum intervals, prompt length, target
validation, and provider account ownership. Redact tokens and secrets from logs and bounded previews.
Expose metrics and a repair path for stuck leases, unknown deliveries, and dead-lettered runs.
Persist retention limits for run history and prune old terminal records without pruning active or
unknown work.

## Risks / Trade-offs

- [Risk] A periodic scanner adds seconds of scheduling latency → expose next-run and actual-run times,
  and keep the interval configurable.
- [Risk] Multiple API instances may race or enqueue after a crash → use row locks, unique occurrence
  and dispatch keys, transactional outbox recovery, and worker idempotency; add a dedicated scheduler
  or leader later if scale requires it.
- [Risk] Queue acceptance or provider delivery can be ambiguous after a timeout → persist `unknown`
  states, use provider idempotency keys, and require explicit retry/reconcile semantics.
- [Risk] Provider limits differ, especially for cards and message size → adapters own chunking,
  throttling, and text fallback; the core records a normalized receipt/error/unknown status.
- [Risk] Recurring agent context can grow or leak across users → isolated mode is default and task
  conversation reuse is explicit, bounded, and scoped to one job.
- [Risk] Missed-run semantics can surprise users → require an explicit policy in the persisted task
  and show it in confirmations and administration views.
- [Risk] A scheduled prompt can invoke a tool that waits for a human or has irreversible side
  effects → use an explicit unattended tool allowlist, deny approval-gated tools, and report the
  denial as a run outcome.
- [Risk] A provider timeout can occur after message acceptance → persist `unknown`, use idempotency
  keys where available, and require explicit retry/reconcile semantics.
- [Risk] Feishu long connections are process-local and the current channel configuration is scoped by
  agent → model provider account references and runtime ownership now, while retaining a single-
  instance Feishu limitation until a channel worker/leader is introduced.

## Migration Plan

1. Add entities, migration, transactional outbox, queue registration, provider interfaces, and
   disabled automation routes.
2. Deploy the Feishu adapter and command parser; existing Feishu channel configurations remain
   unchanged.
3. Enable task creation for a small operator cohort, verify proactive sends, retries, and restart
   recovery, then widen access.
4. Roll back by disabling automation commands and workers; retain task/run rows for inspection and
   do not affect existing interactive Feishu conversations.

The automation migration is named with the current platform semantic version so the installed-version startup reconciliation can discover it. It is idempotent and records execution by migration filename, so restarting after a partial deployment preserves existing jobs and never recreates them.

## Deferred but fixed defaults

- The first console surface is read-only; creator-scoped chat commands manage tasks, while recovery
  is a separately protected operator path.
- Run rows retain bounded previews. Answers larger than the preview limit use the existing artifact
  or report mechanism; small answers are not forced into an artifact.
- Feishu initially permits one configured account per agent. Tasks still persist an opaque account
  reference so multi-account selection can be added without changing the task schema.
