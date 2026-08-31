## Purpose

Provide a reliable new OpenCode conversation experience in which a newly opened conversation is
initialized without transient not-found errors and appears in the agent history immediately after
the server accepts it.

## ADDED Requirements

### Requirement: New OpenCode conversations initialize without transient not-found errors

When a user opens a new OpenCode conversation, the experience MUST tolerate the short interval in
which the client has a draft identifier but the server is creating the durable conversation record.
The user MUST see either the initializing state or the usable OpenCode conversation, not a false
conversation-not-found error caused solely by that initialization interval.

#### Scenario: Open a new conversation from the sidebar

- **WHEN** the user clicks “新对话” for an OpenCode agent
- **THEN** the route opens a draft conversation and keeps the content area in an initializing state
  until the durable conversation can be loaded
- **AND** no “对话不存在” error is shown for the draft initialization race

#### Scenario: Iframe initialization races with durable record creation

- **WHEN** the iframe session request arrives while the draft record is being created
- **THEN** the client retries or waits for the same draft conversation to become available
- **AND** it does not replace the draft with an error state unless initialization definitively fails

### Requirement: Newly accepted conversations update history without a page reload

When the server accepts the first message for a new OpenCode conversation and makes the conversation
durable, the agent history list MUST reflect that conversation without requiring a full page
refresh. The new item MUST use the server-provided title and remain selectable while its stream is
active.

#### Scenario: First message creates a new conversation

- **WHEN** the first message in a local OpenCode draft is accepted by the server
- **THEN** the new conversation appears in the visible history list without a document reload
- **AND** the item is ordered according to the existing updated-at ordering

#### Scenario: New conversation is still streaming

- **WHEN** the newly created conversation has an active turn
- **THEN** the history item remains visible and shows the existing generating state
- **AND** switching conversations does not remove the item from history

### Requirement: Existing conversation behavior remains unchanged

The fix MUST preserve opening existing conversations, local draft messages, history pagination, and
conversation behavior for non-OpenCode agents.

#### Scenario: Select an existing conversation

- **WHEN** the user selects an existing history item
- **THEN** the application opens that conversation normally and does not create a duplicate draft

#### Scenario: Non-OpenCode new chat

- **WHEN** the user starts a new conversation for a non-OpenCode agent
- **THEN** its existing route and persistence behavior remain unchanged
