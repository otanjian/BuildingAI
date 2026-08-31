# opencode-turn-consistency Specification

## Purpose
确保每个 OpenCode 用户回合在 BuildingAI 中具有稳定身份、确定状态和恰好一次的最终投影，使发送、刷新、切换、停止、恢复及计费在异常和并发条件下仍保持一致。
## Requirements
### Requirement: Stable and idempotent turn acceptance
The system MUST accept exactly one current user command under client-generated conversation and turn identifiers, with the turn identifier also serving as the idempotency key. It MUST NOT accept browser-supplied history or assistant/tool-approval messages as OpenCode execution context. It MUST return the stable identifiers and current status without waiting for remote execution to finish. Accepting a new conversation MUST atomically persist the conversation, user message, and turn so that setup failures cannot create a visible empty conversation.

#### Scenario: First request creates one accepted turn
- **WHEN** a user submits a valid OpenCode request with new conversation and turn identifiers
- **THEN** the system persists one user message and one accepted turn and returns their stable conversation and turn identifiers

#### Scenario: Client submits browser history as context
- **WHEN** an OpenCode turn request contains prior messages or a non-user current message
- **THEN** the system rejects it without local or remote side effects because persisted BuildingAI history and the mapped OpenCode session own their respective histories

#### Scenario: Duplicate request is retried
- **WHEN** the same owner retries the same turn identifier, conversation, agent, and request payload
- **THEN** the system returns the existing turn and MUST NOT create another user message or dispatch another OpenCode prompt

#### Scenario: Acceptance response is lost
- **WHEN** the client does not receive the acceptance response
- **THEN** it reuses the same conversation and turn identifiers to query or retry instead of minting another turn

#### Scenario: Turn identifier is reused with different input
- **WHEN** a turn identifier is retried with a different owner, agent, conversation, or request payload
- **THEN** the system rejects the request and MUST NOT reveal or mutate the existing turn

#### Scenario: Conversation already has an active turn
- **WHEN** a different request is submitted to a conversation whose turn is accepted, running, or committing
- **THEN** the system rejects the request with the active turn identifier and MUST NOT create remote or local side effects

#### Scenario: Client supplies a historical parent
- **WHEN** a command attempts to select or override an older message parent in an existing OpenCode conversation
- **THEN** the system rejects it and derives valid linear linkage only from the latest committed turn

#### Scenario: Setup fails after acceptance
- **WHEN** remote setup fails after a turn has been accepted
- **THEN** the conversation retains its user message and the turn exposes an explicit failed outcome instead of an empty conversation

#### Scenario: API restarts before remote dispatch
- **WHEN** an accepted turn loses its original API process before an OpenCode prompt is sent
- **THEN** a recovery worker reconstructs the same validated prompt, system instructions, and model selection from the persisted credential-free dispatch snapshot and persists an artifact baseline before any prompt is sent

#### Scenario: OpenCode runtime binding changes
- **WHEN** the endpoint or workspace binding no longer matches the fingerprint persisted for an accepted turn or mapped session
- **THEN** the system fails explicitly and MUST NOT send the turn or a control request to the mismatched runtime

#### Scenario: Agent execution or billing settings change after acceptance
- **WHEN** non-runtime agent settings change after a turn is accepted
- **THEN** an idempotent retry still returns the accepted turn, and dispatch, output projection, and billing use its persisted credential-free snapshot rather than mixing old and new settings

#### Scenario: Turn reaches a terminal state
- **WHEN** success, cancellation, or failure is committed
- **THEN** personalized dispatch instructions and the artifact baseline are cleared from the turn and are never exposed by turn APIs or structured logs

### Requirement: Exact remote turn correlation
Each accepted turn MUST have one stable OpenCode user message identifier before dispatch. The system MUST correlate remote assistant messages to that identifier through OpenCode's parent relationship and MUST verify whether the remote user message already exists before retrying an ambiguous dispatch.

#### Scenario: Dispatch response is lost
- **WHEN** the OpenCode prompt request times out after its acceptance is uncertain
- **THEN** the system checks for the stable remote user message identifier before retrying and MUST NOT intentionally create a second remote user prompt

#### Scenario: Session contains multiple assistant messages
- **WHEN** OpenCode emits tool-call and final assistant messages for one remote user message
- **THEN** the system projects only the assistant messages whose parent is that turn's remote user message and aggregates them into one BuildingAI turn outcome

#### Scenario: Unrelated remote messages exist
- **WHEN** a mapped OpenCode session contains assistant messages belonging to another user message
- **THEN** recovery MUST NOT attach those messages to the current BuildingAI turn

#### Scenario: Mapped OpenCode session disappears
- **WHEN** the bound OpenCode runtime no longer contains a mapped session that has prior BuildingAI turns
- **THEN** the system fails the current turn explicitly and requires a new conversation rather than silently creating a context-free replacement session

#### Scenario: Lease changes during a remote action
- **WHEN** one worker stalls around dispatch and another instance attempts the same remote action after lease expiry
- **THEN** a conversation-scoped advisory lock serializes all mutations of the shared OpenCode session, the worker revalidates its exact turn claim immediately before the bounded remote mutation, and a later turn cannot dispatch until the older mutation releases the lock

### Requirement: Explicit turn lifecycle and commit boundary
An OpenCode turn MUST expose one of `accepted`, `running`, `committing`, `completed`, `cancelled`, or `failed`. `accepted`, `running`, and `committing` are active states. OpenCode becoming idle MUST move a running turn toward committing and MUST NOT by itself mark the turn completed.

#### Scenario: OpenCode reports idle
- **WHEN** OpenCode reports that the mapped session is idle for the current turn
- **THEN** the turn enters or remains in committing until its BuildingAI outcome is durably committed

#### Scenario: Idle arrives before the final message is readable
- **WHEN** OpenCode becomes idle but the exact terminal assistant descendants are not yet available
- **THEN** the system keeps the turn active, performs bounded exact-message retries, and MUST NOT commit a blank or unrelated assistant projection

#### Scenario: Commit succeeds
- **WHEN** the final assistant projection, usage, billing outcome, conversation statistics, and turn state are committed successfully
- **THEN** the turn becomes completed and exposes the persisted assistant message identifier

#### Scenario: Commit fails
- **WHEN** any required commit operation fails
- **THEN** the turn MUST NOT report completed and a retry MUST NOT duplicate the assistant message or charge

#### Scenario: Final billing is rejected for insufficient balance
- **WHEN** the remote outcome exists but the final point deduction is rejected for insufficient balance
- **THEN** the system commits a visible failed billing outcome without exposing the remote answer and without recording a deduction

### Requirement: Exactly-once terminal projection and billing
Every accepted turn that reaches a terminal state MUST have exactly one terminal BuildingAI assistant projection. Assistant persistence, usage persistence, any applicable point deduction, conversation statistic changes, and terminal turn transition MUST share an atomic commit boundary. A terminal failure or cancellation MUST remain visible after reload and MUST NOT be represented by a blank assistant message.

#### Scenario: Successful billed turn
- **WHEN** a chargeable turn completes with non-zero usage
- **THEN** exactly one assistant projection and exactly one turn-level deduction are committed together

#### Scenario: Commit is retried after a crash
- **WHEN** a worker crashes during commit and another worker retries the same turn
- **THEN** the resulting history and account balance are the same as if the commit ran once

#### Scenario: User stops after partial usage
- **WHEN** a user stops a running turn that has already consumed tokens
- **THEN** the system records a non-blank cancelled outcome and applies the configured partial-usage billing rule at most once

#### Scenario: Debug or free turn completes
- **WHEN** a debug turn completes or OpenCode point billing is disabled
- **THEN** the system persists actual available usage with zero deducted points

#### Scenario: Minimum point precheck fails
- **WHEN** a chargeable request lacks the configured minimum spendable points at acceptance time
- **THEN** the system rejects it before creating a conversation, user message, turn, or OpenCode prompt

#### Scenario: Balance changes after a turn was accepted
- **WHEN** the same command is retried after acceptance and the user's current balance or billing configuration has changed
- **THEN** the system returns the existing turn before applying new-turn prechecks and does not dispatch or bill it again

#### Scenario: Duplicate billing insertion is attempted
- **WHEN** retry or concurrency attempts to insert another deduction for the same OpenCode turn
- **THEN** the database's namespaced turn-billing uniqueness rejects the duplicate and the terminal transaction is reconciled without a second charge

### Requirement: History reads are side-effect free
Conversation and message read APIs MUST use BuildingAI persistence as their source of truth and MUST NOT contact OpenCode, approve permissions, answer questions, create messages, change turn state, or abort a session.

#### Scenario: OpenCode is unavailable during history read
- **WHEN** a user opens a persisted conversation while OpenCode is unavailable or slow
- **THEN** the history request returns BuildingAI data without waiting for OpenCode

#### Scenario: Active conversation is read repeatedly
- **WHEN** clients concurrently or repeatedly read an active conversation
- **THEN** those reads do not dispatch, recover, cancel, or duplicate any turn

### Requirement: Turn access preserves conversation ownership
Every accept, status, and Stop operation MUST authorize the agent plus registered-user or anonymous owner through the mapped conversation. An identifier that belongs to another owner MUST NOT reveal turn state.

#### Scenario: Another owner queries a turn
- **WHEN** a registered or anonymous caller presents a valid turn identifier owned by someone else
- **THEN** the system returns the same non-revealing not-found or forbidden contract used for conversation access and does not mutate the turn

### Requirement: Lease-based and evidence-based recovery
Active turns MUST be recoverable after process loss through a durable lease. Only one worker may own recovery for a turn at a time, and each API instance MUST claim work only up to its configured local worker capacity. Recovery MUST use the persisted turn identity, OpenCode session status, and exact remote message relationship; it MUST NOT classify a session as stuck solely because an assistant finish field is empty.

#### Scenario: API restarts while OpenCode is busy
- **WHEN** a turn lease expires after an API restart and OpenCode reports the mapped session busy or retrying
- **THEN** one recovery worker resumes observation without aborting or redispatching the turn

#### Scenario: OpenCode completed before BuildingAI
- **WHEN** recovery finds the exact remote user message and its completed assistant descendants while the turn is not committed
- **THEN** recovery commits the normal BuildingAI projection once

#### Scenario: Two instances attempt recovery
- **WHEN** two API instances attempt to recover the same expired turn
- **THEN** only one claim token remains current, stale workers are fenced from further state changes, and the local terminal projection is committed once

#### Scenario: More turns are pending than local capacity
- **WHEN** an API instance has no free worker slot while more turns are claimable
- **THEN** it leaves the excess turns unclaimed for a later reconciliation cycle or another instance instead of opening unbounded observation loops

#### Scenario: Turn exceeds inactivity policy
- **WHEN** an owned turn has no changed remote status, session update, message, or interaction evidence beyond the configured inactivity limit, and it is not waiting for a future provider retry deadline
- **THEN** the worker performs one final bounded evidence check, may abort that exact turn even if a stale status still says busy, and records an explicit failed outcome with a timeout reason

#### Scenario: Productive long-running turn
- **WHEN** a long-running turn continues to produce changed remote evidence within the inactivity limit
- **THEN** repeated polls do not impose a fixed wall-clock failure merely because the turn is old

### Requirement: Turn-scoped stop control
Stop requests MUST identify the target turn. Stopping a turn MUST be idempotent, and a request for an older or terminal turn MUST NOT affect a later turn in the same conversation.

#### Scenario: Current turn is stopped
- **WHEN** the user stops the currently active turn
- **THEN** cancellation is requested for that turn, status exposes the request, and any remote abort targets only its mapped OpenCode session before one local cancellation outcome is recorded

#### Scenario: Accepted turn is stopped before dispatch
- **WHEN** Stop is accepted before the worker sends the OpenCode prompt
- **THEN** the worker commits one cancellation outcome without creating a remote session or prompt

#### Scenario: Stop arrives while committing
- **WHEN** a turn has already entered committing after remote execution settled
- **THEN** Stop returns the current state without aborting the session or changing the pending terminal outcome

#### Scenario: Delayed stop targets an old turn
- **WHEN** a delayed stop request arrives for a terminal turn after a new turn exists
- **THEN** the request is a no-op for remote execution and the new turn continues unchanged

#### Scenario: Stop is repeated
- **WHEN** the same stop request is submitted multiple times
- **THEN** all responses describe the same cancellation outcome without duplicate local messages or billing, and any ambiguous remote abort retry still targets only that turn's session

#### Scenario: Remote abort cannot be confirmed
- **WHEN** an abort response is lost or OpenCode remains busy after cancellation is requested
- **THEN** the turn remains active with cancellation requested, blocks another turn in that conversation, and is not committed as cancelled or failed until remote settlement is evidenced

### Requirement: OpenCode interactions cannot hang a headless turn
The worker MUST handle pending permission and question requests for the exact current session without waiting for a browser. It MUST preserve the existing server-side automatic permission policy; redesigning that policy is outside this capability. Until interactive questions are introduced as a separate capability, it MUST reject a question and finish the turn with an explicit explanation.

#### Scenario: OpenCode requests permission
- **WHEN** the current OpenCode turn has a pending permission request
- **THEN** the worker applies the existing automatic policy to that exact request or fails the turn explicitly if the request cannot be resolved

#### Scenario: OpenCode asks a question
- **WHEN** the current OpenCode turn emits a question request
- **THEN** the system rejects that request without waiting for browser input, settles the exact remote session, and records an explicit non-blank failed outcome explaining that interactive questions are unsupported

#### Scenario: Question event is delivered again
- **WHEN** the same question request is observed more than once
- **THEN** repeated rejection does not create a new BuildingAI turn, assistant message, or billing side effect

### Requirement: Deterministic client projection
The OpenCode client MUST render persisted BuildingAI history plus at most one turn-keyed activity indicator. BuildingAI conversation reads MUST expose that active turn's identifier and summary from the durable turn row. Partial OpenCode text and tool events MUST NOT be represented as persisted history before commit. A new conversation MUST NOT require rekeying a live Chat instance from a provisional key.

#### Scenario: New conversation is accepted
- **WHEN** the server accepts the client-generated conversation and turn identifiers
- **THEN** navigation and subsequent status reads use those identifiers and no provisional streaming Chat remains

#### Scenario: Conversation is reopened mid-turn
- **WHEN** a user opens a conversation with an active turn
- **THEN** the BuildingAI read returns that turn's identifier and status, and the client shows its activity without opening an OpenCode event stream or reading OpenCode directly

#### Scenario: Turn commit becomes visible
- **WHEN** status reports a terminal committed assistant identifier
- **THEN** the client refreshes history and removes the matching activity indicator without duplicating content

#### Scenario: History response races a new user message
- **WHEN** persisted history is requested for a conversation and a new user message enters the in-memory chat before that request returns
- **THEN** the client merges the persisted history with the live message by stable database identity instead of discarding the history page or duplicating the new message

#### Scenario: Status polling is degraded
- **WHEN** an active-turn status request is already in flight or fails temporarily
- **THEN** the client does not overlap another request for that turn and retries with bounded backoff

### Requirement: OpenCode regeneration is safe during consistency migration
Until an exact OpenCode branch-regeneration contract is implemented, the OpenCode UI and API MUST reject regeneration or editing of a previously sent turn explicitly and MUST NOT call a Chat instance or mutate the mapped OpenCode session.

#### Scenario: User requests regeneration
- **WHEN** a user invokes regeneration on an OpenCode assistant message
- **THEN** the system returns a clear unsupported response and leaves BuildingAI history and the OpenCode session unchanged

#### Scenario: User edits an older OpenCode message
- **WHEN** a user invokes an edit flow that would replace or branch from a persisted OpenCode user message
- **THEN** the system returns a clear unsupported response and leaves BuildingAI history and the OpenCode session unchanged

#### Scenario: User sends from a historical branch
- **WHEN** an OpenCode conversation contains a legacy message branch that cannot be proven to match the mapped linear session
- **THEN** that branch remains read-only and the system requires a new conversation for further execution

### Requirement: Conversation mutations preserve active turns
Non-destructive archive state MUST NOT own or stop a turn. Destructive deletion MUST NOT race an active turn.

#### Scenario: Active conversation is archived
- **WHEN** an owner archives a conversation with an active OpenCode turn
- **THEN** the turn continues unchanged and remains discoverable through direct conversation reads even though normal agent lists hide the archived conversation

#### Scenario: Active conversation is deleted
- **WHEN** an owner requests deletion of a conversation with an active OpenCode turn
- **THEN** the system rejects deletion with an active-turn conflict and requires the exact turn to reach a terminal state first

### Requirement: Compatibility status is a response projection only
During migration, any legacy OpenCode status field exposed by a conversation API for a durable conversation MUST be computed from the active turn and MUST NOT be persisted as another durable status or used to own, recover, stop, or commit a turn.

#### Scenario: Legacy conversation list reads status
- **WHEN** a legacy client lists conversations during rollout
- **THEN** it receives a compatible generating status derived from the durable turn without creating a second source of truth

#### Scenario: Legacy mapping is ambiguous
- **WHEN** migration finds duplicate runtime/session mappings or a BuildingAI message branch that cannot be correlated to the linear OpenCode session
- **THEN** the conversation is not guessed into durable mode and remains legacy or read-only until explicitly resolved

