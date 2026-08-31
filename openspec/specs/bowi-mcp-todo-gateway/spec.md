# bowi-mcp-todo-gateway Specification

## Purpose
Provide Bowi AI and managed OpenCode sessions with one discoverable, secure MCP contract for operating only the personal Todo data of a verified Bowi AI user.
## Requirements
### Requirement: Bowi exposes a stable Todo tool catalog
The system SHALL expose one first-party Bowi MCP endpoint whose authenticated `tools/list` response is stable across user sessions and includes tools to search visible todos, search eligible assignees, create a todo, update a todo definition, update progress, and delete a todo. Identity and authorization inputs MUST NOT appear in model-visible tool schemas.

#### Scenario: Discover Todo tools before resolving a user
- **WHEN** an authenticated managed client lists Bowi MCP tools before a user session is selected
- **THEN** the system returns the complete Todo tool definitions without requiring a user identifier

#### Scenario: Reject an unauthenticated client
- **WHEN** an unknown client calls the Bowi MCP endpoint
- **THEN** the system rejects the request without listing or executing tools

### Requirement: Todo calls use a verified personal subject
The system MUST derive the Todo subject from a verified platform invocation or managed OpenCode session. A model-supplied user identifier, a published-agent credential, a site access token, an anonymous session, or an ambiguous historical session MUST NOT grant access to a user's Todo data.

#### Scenario: Authenticated Bowi AI user invokes Todo
- **WHEN** a first-party agent turn carries a short-lived invocation assertion for a logged-in Bowi AI user
- **THEN** Bowi executes the Todo tool as that verified user

#### Scenario: Managed OpenCode session invokes Todo
- **WHEN** a managed OpenCode runtime calls a Todo tool with hidden session context bound to a verified logged-in user
- **THEN** Bowi resolves and executes as that bound user

#### Scenario: Published agent cannot inherit its creator
- **WHEN** a Todo call originates from an agent publish key or site access token that maps operationally to the agent creator
- **THEN** Bowi rejects the call because no verified personal subject is present

#### Scenario: Caller supplies a forged user field
- **WHEN** a caller includes a user ID in tool arguments
- **THEN** the system rejects the unknown argument or ignores it for identity resolution

### Requirement: MCP Todo tools preserve Todo domain rules
All Todo tool execution SHALL delegate to the existing Todo domain behavior so visibility remains creator-or-current-assignee, definition updates and deletion remain creator-only, lifecycle updates remain creator-or-current-assignee, assignments require an eligible active user, and stale mutations are rejected.

#### Scenario: Search visible todos
- **WHEN** a verified user calls `todo_search` with lifecycle, relationship, text, date, or progress filters
- **THEN** the system returns only non-deleted todos created by or assigned to that user that match all supplied filters

#### Scenario: Create a Todo
- **WHEN** a verified user calls `todo_create` with valid content and an optional eligible assignee
- **THEN** the system creates the Todo with that user as immutable creator and returns its server-generated state

#### Scenario: Assignee reports progress
- **WHEN** the current assignee calls `todo_set_progress` with a valid progress and current `expectedUpdatedAt`
- **THEN** the system applies the existing progress, status, and actual-completion-time normalization atomically

#### Scenario: Assignee attempts creator-only mutation
- **WHEN** an assignee who is not the creator calls `todo_update` or `todo_delete`
- **THEN** the system denies the operation without broadening the Todo domain rules

#### Scenario: Reject stale mutation
- **WHEN** a Todo mutation supplies an `expectedUpdatedAt` that no longer matches
- **THEN** the tool returns a stable conflict error and does not overwrite newer data

### Requirement: Tool execution returns model-actionable results
Successful tools SHALL return MCP text content and structured data. Expected business failures SHALL return a tool result with `isError: true` and a stable structured error code; malformed MCP protocol requests and unknown methods SHALL use protocol errors.

#### Scenario: Business validation fails
- **WHEN** a verified user calls a Todo tool with an invalid assignee, stale version, or unauthorized Todo operation
- **THEN** the result has `isError: true`, a stable error code, and a concise message that does not expose unrelated Todo data

#### Scenario: Tool succeeds
- **WHEN** a Todo tool completes successfully
- **THEN** the result contains readable text plus structured Todo or search data for subsequent tool calls

### Requirement: Managed OpenCode injects hidden Bowi invocation context
Managed OpenCode SHALL configure the Bowi MCP server automatically and SHALL inject the current session ID and tool call ID into MCP request `_meta` when invoking Bowi tools. The context MUST remain outside tool arguments and model-visible conversation content.

#### Scenario: OpenCode invokes a Bowi tool
- **WHEN** a managed OpenCode session executes a Bowi MCP tool
- **THEN** the request includes hidden `sessionId` and `callId` metadata used by the server to resolve and audit the invocation

#### Scenario: Context cannot be resolved
- **WHEN** the supplied session does not map unambiguously to a verified Bowi AI user
- **THEN** Bowi fails closed and performs no Todo read or mutation

### Requirement: Existing EHCS Bowi behavior remains compatible
The existing EHCS Bowi MCP endpoint and tool names SHALL continue to operate during this change, and Todo authorization SHALL NOT grant EHCS capabilities.

#### Scenario: Existing EHCS agent continues operating
- **WHEN** an existing EHCS agent uses the legacy Bowi endpoint and tool names
- **THEN** its existing workflow remains available without requiring Todo capability

#### Scenario: Todo user attempts EHCS execution
- **WHEN** a user authenticated only for personal Todo calls an EHCS business tool
- **THEN** the unified Todo gateway does not grant or infer EHCS authorization
