## MODIFIED Requirements

### Requirement: Manage tasks within channel scope

The system SHALL allow a task creator to list, inspect, pause, resume, run once, update, and cancel
tasks created in the current authorized channel scope. Management operations SHALL be idempotent and
SHALL not reveal tasks belonging to another creator, tenant/account, or chat scope. A manual run
SHALL use the same idempotency and authorization rules as a scheduled run and SHALL NOT silently
alter the task's natural next occurrence.

The authenticated web workspace SHALL expose tasks created by the authenticated creator or delivered
by an agent owned by that creator through a navigation entry immediately after `新对话`, using the
same lifecycle APIs and authorization rules. The web view SHALL not expose channel credentials or
create a second persistence path. Each non-terminal task SHALL provide an edit action that can
update its name, prompt, schedule definition, delete-after-run flag, missed-run policy, overlap
policy, and timeout. The edit action SHALL preserve the task's agent, channel, account,
conversation, and delivery target. A successful delete SHALL remove the task from the visible list
immediately while retaining run and dispatch audit history.

#### Scenario: List own tasks

- **WHEN** a user requests the task list in a chat
- **THEN** the system returns only tasks visible to that user and chat, including status and next
  run

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
  creator, and allows the same pause, resume, run-once, update, and cancel operations without
  changing the task's channel delivery target

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
- **THEN** the web workspace invokes the canonical automation delete operation, removes the task
  from the visible list after success, the task stops future scheduling, and run/dispatch audit
  history remains retained; repeating the delete remains idempotent

#### Scenario: Edit a task definition from the web workspace

- **WHEN** an authenticated creator opens a non-terminal task's edit action, changes one or more
  editable fields, and submits the current `updatedAt` value
- **THEN** the workspace persists the updated name, prompt, normalized schedule and execution
  policies, recalculates the next occurrence, preserves agent and delivery scope, closes the editor,
  and shows the updated task

#### Scenario: Reject stale or invalid task edits

- **WHEN** an edit uses a stale `updatedAt`, blank prompt/name, invalid schedule, or out-of-range
  policy value
- **THEN** the server rejects the update without overwriting the task and the workspace keeps the
  editor open with an actionable error

#### Scenario: Hide editing for terminal tasks

- **WHEN** a task is cancelled or completed
- **THEN** the workspace does not offer an edit action and the server rejects direct update attempts
