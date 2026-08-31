## ADDED Requirements

### Requirement: API-driven side panel

The OpenCode agent workspace MUST render an optional right-side panel that reads the current conversation's OpenCode session through BuildingAI APIs instead of embedding the OpenCode web page.

#### Scenario: OpenCode conversation is selected

- **WHEN** an OpenCode agent conversation is opened on desktop
- **THEN** the side panel is available and shows `对话` and `文件` tabs
- **AND** the selected conversation id is used for all panel requests

### Requirement: Refresh-safe message and progress display

The side panel MUST hydrate from the OpenCode session snapshot and update running messages/tool parts from the proxied event stream, with polling fallback.

#### Scenario: Page is refreshed while a turn is running

- **WHEN** the user refreshes an OpenCode conversation with an active turn
- **THEN** the side panel reloads the persisted OpenCode session messages
- **AND** subsequent event or polling updates replace the same message/part instead of duplicating it

### Requirement: Shared interaction lifecycle

The side panel MUST use the existing conversation turn lifecycle for send, stop, and question reply/reject actions.

#### Scenario: User sends from the side panel

- **WHEN** the user submits text in the side panel
- **THEN** the existing conversation/turn transport is invoked
- **AND** the main chat and side panel observe the same resulting progress

#### Scenario: OpenCode asks a question

- **WHEN** a pending OpenCode question is returned by status or events
- **THEN** the side panel renders the structured question card
- **AND** answering or rejecting it calls the existing authorized endpoint

### Requirement: Workspace continuity

The existing OpenCode workspace file browser MUST remain available in the side panel without changing its API or path semantics.

#### Scenario: User switches to files

- **WHEN** the `文件` tab is selected
- **THEN** the existing lazy file tree and preview are shown
- **AND** returning to `对话` preserves the conversation snapshot and input state
