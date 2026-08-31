# multichannel-automations Specification

## Purpose
Provide durable, user-managed scheduled agent work that can be created from a connected conversation
and delivered through Feishu now, while keeping scheduling, execution, authorization, and delivery
contracts reusable for future enterprise messaging channels.
## Requirements
### Requirement: Create and validate an automation

The system SHALL allow an authorized channel user to create an automation with a name, agent,
prompt, schedule kind (`at`, `every`, or `cron`), timezone where applicable, delivery channel,
provider account/tenant reference, delivery target, and optional execution policy. The system SHALL
reject invalid schedules, empty prompts, unsupported agents, unauthorized targets or provider
accounts, and values exceeding configured limits before persisting the task. A natural-language
request that is ambiguous or changes an existing schedule SHALL be shown as a preview and require
explicit confirmation before persistence.

#### Scenario: Create a one-shot task

- **WHEN** a user submits a valid future `at` time, prompt, agent, and channel target
- **THEN** the system persists an enabled task, computes its next run, and returns a stable task ID
  and human-readable schedule summary

#### Scenario: Create a recurring task

- **WHEN** a user submits a valid `every` interval or `cron` expression with an IANA timezone
- **THEN** the system persists the recurrence and reports the next occurrence using that timezone

#### Scenario: Reject an invalid task

- **WHEN** a request has an invalid schedule, blank prompt, unavailable agent, or unauthorized
  delivery target
- **THEN** the system returns a field-level error and creates no task

#### Scenario: Preview an ambiguous natural-language schedule

- **WHEN** a user asks for a schedule whose time, timezone, recurrence, or target cannot be
  determined unambiguously
- **THEN** the system returns a normalized preview and does not create or enable a task until the
  user explicitly confirms it

#### Scenario: Duplicate create command delivery

- **WHEN** the same channel event is delivered more than once while creating a task
- **THEN** the system uses the event idempotency key to return one creation result and does not
  create duplicate tasks

#### Scenario: Intercept an explicit schedule intent before group mention filtering

- **WHEN** a Feishu group message clearly requests a schedule (for example, it contains a task
  creation phrase or a recurrence/time plus a send/remind action) without mentioning the bot
- **THEN** the channel gives the message to the automation interceptor first, while ordinary
  unmentioned group discussion remains ignored when `onlyMentioned` is enabled

#### Scenario: Confirm a natural-language schedule exactly once

- **WHEN** a user sends a bounded natural-language schedule and then explicitly confirms the
  normalized preview
- **THEN** the system atomically consumes the actor/account/tenant/conversation-bound pending
  confirmation, creates one task through the same service as `/schedule`, and triggers one auditable
  immediate smoke run without shifting the recurring next occurrence

#### Scenario: Reject an expired or mismatched confirmation

- **WHEN** a confirmation is expired, cancelled, replayed, or sent by a different actor/account/
  tenant/conversation
- **THEN** no task or run is created and the user receives a safe expiration or scope error

### Requirement: Manage tasks within channel scope

The system SHALL allow a task creator to list, inspect, pause, resume, run once, and cancel tasks
created in the current authorized channel scope. Management operations SHALL be idempotent and SHALL
not reveal tasks belonging to another creator, tenant/account, or chat scope. A manual run SHALL use
the same idempotency and authorization rules as a scheduled run and SHALL NOT silently alter the
task's natural next occurrence.

The authenticated web workspace SHALL expose tasks created by the authenticated creator or delivered
by an agent owned by that creator through a navigation entry immediately after `新对话`, using the
same lifecycle APIs and authorization rules. Channel users remain limited to their creator and chat
scope. The web view SHALL not expose channel credentials or create a second persistence path.

#### Scenario: List own tasks

- **WHEN** a user requests the task list in a chat
- **THEN** the system returns only tasks visible to that user and chat, including status and next run

#### Scenario: Cancel a task twice

- **WHEN** a creator cancels an already canceled task
- **THEN** the system returns the same terminal state without scheduling or executing another run

#### Scenario: Reject cross-scope access

- **WHEN** a channel user references a task owned by another user or chat
- **THEN** the system behaves as if the task is not accessible and performs no state change

#### Scenario: Manually run without shifting recurrence

- **WHEN** a creator requests a one-time manual run of a recurring task
- **THEN** the system creates an explicitly marked manual run and preserves the task's persisted
  next scheduled occurrence

#### Scenario: Open the web task workspace

- **WHEN** an authenticated creator selects `定时任务` below `新对话`
- **THEN** the system shows tasks created by that creator or delivered by an agent owned by that
  creator, and allows the same pause, resume, run-once, and cancel operations without changing the
  task's channel delivery target

#### Scenario: Resolve external channel identity

- **WHEN** a channel adapter receives an external actor identity
- **THEN** the Feishu adapter fetches the sender name and exact-matches `User.nickname`, using the
  matched local user ID for the current task/MCP interaction; if no match exists, it uses a stable
  provider-scoped external identity. Existing task creator IDs are not migrated.

#### Scenario: Show tasks from an owned agent in the web workspace

- **WHEN** an authenticated web user opens the task workspace
- **THEN** tasks delivered by agents owned by that user are visible, including tasks created from a
  channel external identity, and lifecycle operations remain restricted to those owned agents

#### Scenario: Distinguish waiting and running states in the web workspace

- **WHEN** an authenticated creator opens the task workspace
- **THEN** an active task whose latest run is not currently running is labeled `待执行`, meaning it
  is waiting for its next scheduled occurrence, and a task with a run currently in progress is
  labeled `运行中`

#### Scenario: Delete a task from the web workspace

- **WHEN** an authenticated creator confirms deletion of a task, including one already in the
  cancelled state
- **THEN** the web workspace invokes the canonical automation delete operation, the task stops future
  scheduling, and run/dispatch audit history remains retained according to the automation lifecycle
  contract; repeating the delete remains idempotent

### Requirement: Expose automation management through Bowi MCP

The canonical `bowi-mcp` server SHALL expose `automation_create`, `automation_search`,
`automation_get`, `automation_update`, `automation_pause`, `automation_resume`, `automation_run`,
and `automation_delete` tools. Every tool SHALL require a verified personal Bowi principal and
delegate to the same durable automation application service used by channel and web APIs. Tool
arguments SHALL not accept creator IDs, credentials, arbitrary delivery secrets, or unattended tool
allowlists. Creation SHALL require a server-signed channel scope; update and delete SHALL support
optimistic concurrency with `expectedUpdatedAt`, and delete SHALL retain audit rows through a
terminal task state.

#### Scenario: Discover automation tools

- **WHEN** a verified personal principal lists Bowi MCP tools
- **THEN** the catalog contains the automation management tools with schemas and does not expose
  their implementation functions or credentials

#### Scenario: Create through Bowi MCP

- **WHEN** a verified principal calls `automation_create` with a valid schedule and signed channel
  scope
- **THEN** one task is persisted through `AutomationService`, the response contains a bounded task
  DTO, and a repeated idempotency key returns the same task

#### Scenario: Reject model-invented delivery scope

- **WHEN** `automation_create` is called without a signed channel scope or with a target outside it
- **THEN** the call is rejected and no task row is created

#### Scenario: Query and update through Bowi MCP

- **WHEN** a creator calls `automation_search`, `automation_get`, or `automation_update`
- **THEN** only the creator's tasks are visible and stale `expectedUpdatedAt` updates fail without
  overwriting a newer task definition

#### Scenario: Delete through Bowi MCP

- **WHEN** a creator calls `automation_delete` for an active task
- **THEN** the task enters the idempotent cancelled terminal state, future occurrences are not
  claimed, and run/dispatch history remains inspectable

#### Scenario: Reuse the MCP boundary from Feishu

- **WHEN** a confirmed Feishu command creates or manages a task
- **THEN** the adapter invokes the same Bowi automation operation used by MCP clients and does not
  perform a second direct persistence implementation

### Requirement: Execute due tasks durably

The system SHALL execute due enabled tasks asynchronously and record a separate run for each logical
occurrence. It SHALL prevent duplicate occurrence execution, enforce a per-run timeout, support
bounded retries, persist terminal success, failure, timeout, cancellation, and unknown states, and
make run ownership/recovery observable. Execution success and message delivery status SHALL be
recorded separately.

#### Scenario: Execute a due task once

- **WHEN** a task becomes due
- **THEN** the system creates one run, invokes the configured agent with the task prompt, records the
  result, and advances the task to its next occurrence or terminal state

#### Scenario: Recover after restart

- **WHEN** the service restarts with persisted tasks whose next run is due or overdue
- **THEN** the scheduler applies the configured missed-run policy and does not lose the task

#### Scenario: Duplicate scheduler claim

- **WHEN** multiple workers observe the same due occurrence
- **THEN** database or equivalent atomic ownership guarantees allow at most one run to execute it

#### Scenario: Queue hand-off fails after commit

- **WHEN** a due run is committed but queue publication fails or the process exits before publication
- **THEN** a durable pending dispatch is recovered and published later without creating a second
  logical run

#### Scenario: Worker or provider result is ambiguous

- **WHEN** a worker or upstream provider times out after work may have started
- **THEN** the run is marked unknown or retry-pending according to policy and is not blindly replayed
  as a new logical occurrence

#### Scenario: One-shot completion with required delivery

- **WHEN** a one-shot run succeeds but required delivery fails or remains unknown
- **THEN** the task remains inspectable and is not deleted or reported as fully completed until the
  configured delivery policy is satisfied

### Requirement: Deliver through an extensible channel contract

The system SHALL route every scheduled result through a channel-neutral delivery contract that
supports target validation, text delivery, optional progressive card delivery, and delivery error
reporting. The contract SHALL support provider account/tenant selection, idempotency keys, capability
negotiation, and `delivered`, `failed`, and `unknown` outcomes. Adding a new channel adapter SHALL NOT
require changing schedule persistence or agent execution semantics.

#### Scenario: Deliver a Feishu result

- **WHEN** a Feishu-targeted run succeeds
- **THEN** the Feishu adapter proactively sends the result to the stored user or group target and
  records the provider message identifier, delivery outcome, and account reference when available

#### Scenario: Delivery is unavailable

- **WHEN** the selected channel rejects or cannot deliver a result
- **THEN** the run records delivery failure, retains the agent result for inspection, and applies the
  configured delivery retry policy without marking the run as fully delivered

#### Scenario: Register a future adapter

- **WHEN** a DingTalk or WeCom adapter is added later
- **THEN** it implements the same channel contract and can be selected for new tasks without changing
  the automation scheduler or run schema

#### Scenario: Provider timeout after acceptance

- **WHEN** a provider request times out after the provider may have accepted the message
- **THEN** the adapter reports `unknown`, the system preserves the result, and retry behavior follows
  the provider idempotency and operator policy instead of assuming safe failure

### Requirement: Confirm and notify in the originating conversation

The system SHALL provide an immediate creation or management confirmation and SHALL send a concise
success, failure, timeout, or cancellation notification to the configured delivery target. Group
chat commands SHALL honor the channel's mention policy. Failure notifications SHALL use a separate
configurable route when the primary route is unavailable and SHALL be deduplicated per run.

#### Scenario: Confirm task creation

- **WHEN** a valid task is created from a Feishu conversation
- **THEN** the bot replies with the task ID, schedule, timezone, next run, and cancellation hint

#### Scenario: Notify a failed run

- **WHEN** an execution or delivery attempt reaches its retry limit
- **THEN** the bot sends a safe failure notification containing the task ID and run time without
  exposing credentials or internal stack traces

#### Scenario: Primary delivery is unavailable

- **WHEN** the primary result destination cannot be resolved or repeatedly rejects delivery
- **THEN** the system records the failure and uses the configured failure destination at most once
  per terminal run, or marks the notification pending for operator recovery

### Requirement: Protect unattended execution

The system SHALL bind each task to its creator, agent, channel, and target; enforce task and prompt
quotas; keep credentials out of task responses and logs; and disallow arbitrary shell or code
execution as a scheduled payload. Unattended execution SHALL use a server-controlled tool policy:
approval-gated or high-risk tools are denied unless explicitly pre-authorized, and an interactive
conversation's broader tool permissions SHALL NOT carry over automatically.

#### Scenario: Exceed a quota

- **WHEN** a user exceeds the configured task count, prompt length, or minimum interval
- **THEN** creation is rejected with a safe limit error

#### Scenario: Inspect task output

- **WHEN** an administrator or creator views a task or run
- **THEN** the response contains masked channel metadata and bounded output/error previews only

#### Scenario: Scheduled tool requires approval

- **WHEN** an agent attempts an approval-gated or disallowed high-risk tool during an unattended run
- **THEN** the tool call is denied or the run enters a safe blocked outcome, without waiting forever
  for an interactive user approval

#### Scenario: Apply server-authored tool policy

- **WHEN** a scheduled run is invoked from a confirmed task
- **THEN** the executor carries the persisted server-authored unattended policy into the internal
  agent execution context and ignores client/model-supplied permission expansion

### Requirement: Reconcile and operate stuck work

The system SHALL expose enough task, run, and dispatch state to identify overdue jobs, stale worker
leases, dead-lettered dispatches, and unknown deliveries. Authorized operators SHALL be able to retry
or dismiss a delivery/dispatch failure without creating a duplicate logical occurrence.

#### Scenario: Recover a stale dispatch lease

- **WHEN** a dispatch lease expires without a terminal acknowledgement
- **THEN** the recovery process reclaims it according to its attempt policy and preserves the stable
  dispatch key

#### Scenario: Dismiss an unknown delivery

- **WHEN** an authorized operator dismisses an unknown delivery
- **THEN** the run remains execution-successful but is marked not-delivered/acknowledged and is not
  automatically replayed

### Requirement: Report scheduler runtime health

The system SHALL expose scheduler and dispatcher health, including whether scheduling is active,
oldest due-task lag, pending/leased/unknown dispatch counts, and the last successful reconciliation.
The health state SHALL make clear that tasks do not fire while the owning runtime is stopped.

#### Scenario: Runtime is stopped

- **WHEN** the API or automation worker is not running
- **THEN** the operational status reports scheduling as inactive and does not claim that due tasks
  were executed

#### Scenario: Dispatcher is degraded

- **WHEN** pending or leased dispatches exceed the configured age threshold
- **THEN** the operational status reports degraded dispatch health with a recoverable count and the
  oldest pending age

