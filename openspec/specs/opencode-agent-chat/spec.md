# opencode-agent-chat Specification

## Purpose
TBD - created by archiving change opencode-agent-integration. Update Purpose after archive.
## Requirements
### Requirement: OpenCode agent mode is selectable for Agent workbench

The system SHALL allow creating and updating an Agent with `createMode` equal to `opencode`, and SHALL route Agent workbench chat for that Agent to OpenCode instead of the native tool-loop agent.

#### Scenario: OpenCode agent chat is delegated

- **WHEN** a user sends a message to an Agent whose `createMode` is `opencode`
- **THEN** the system MUST NOT run the native Bowi AI tool-loop agent for that request
- **AND** the system MUST forward the user requirement to the configured OpenCode server

#### Scenario: Non-OpenCode agents unchanged

- **WHEN** a user chats with an Agent whose `createMode` is `direct`, `dify`, or `coze`
- **THEN** existing chat behavior for that mode MUST remain unchanged

### Requirement: Conversation records stay in Bowi AI with session mapping

The system SHALL persist Agent conversations and messages in Bowi AI, SHALL map each Bowi AI conversation id one-to-one to an OpenCode session id, and SHALL make the full conversation history visible in the Agent workbench.

#### Scenario: New conversation creates mapped OpenCode session

- **WHEN** a user starts a new conversation with an OpenCode Agent
- **THEN** the system MUST create a Bowi AI conversation record
- **AND** MUST create or obtain an OpenCode session bound to that conversation id
- **AND** MUST store the OpenCode session mapping for later turns

#### Scenario: Resume conversation reuses OpenCode session

- **WHEN** a user continues an existing OpenCode Agent conversation
- **THEN** the system MUST reuse the mapped OpenCode session for that conversation id

#### Scenario: History visible without OpenCode

- **WHEN** a user reopens a past OpenCode Agent conversation in the workbench
- **THEN** the system MUST show previously persisted assistant text, tool steps, and artifact metadata from Bowi AI storage

### Requirement: L2 artifact isolation under fixed workspace

The system SHALL execute OpenCode against a configured fixed business workspace and SHALL isolate conversation outputs under an artifact directory keyed by conversation id (L2 isolation).

#### Scenario: Artifacts written per conversation

- **WHEN** OpenCode produces files for a conversation
- **THEN** HTML and other declared artifacts for that conversation MUST be stored under that conversation’s artifact directory inside the fixed workspace
- **AND** one conversation MUST NOT read another conversation’s artifact directory through the Bowi AI artifact API

#### Scenario: Fixed workspace configuration

- **WHEN** an OpenCode Agent is configured with a workspace path
- **THEN** OpenCode execution for that Agent MUST use that workspace as the project directory

### Requirement: Streaming tool and terminal steps appear in the dialog

The system SHALL stream OpenCode execution progress into the Agent dialog, including file read/write/edit and terminal/bash steps, as structured tool parts alongside assistant text.

#### Scenario: File and terminal steps stream live

- **WHEN** OpenCode performs file or terminal tool actions during a turn
- **THEN** the Agent dialog MUST show those steps as streaming tool parts before or while the final answer appears

#### Scenario: Stop aborts OpenCode session work

- **WHEN** a user stops an in-progress OpenCode Agent chat turn
- **THEN** the system MUST request abort on the mapped OpenCode session

### Requirement: HTML report or dashboard preview via iframe

The system SHALL detect HTML artifacts for a conversation (preferring `index.html` under the conversation artifact directory) and SHALL present them in the Agent dialog using an authenticated artifact URL rendered in a sandboxed iframe preview.

#### Scenario: HTML artifact preview after generation

- **WHEN** a turn produces an HTML report or dashboard under the conversation artifact directory
- **THEN** the dialog MUST expose a preview that loads the artifact through Bowi AI’s authenticated artifact endpoint in an iframe

#### Scenario: Artifact access is authorized

- **WHEN** a client requests an artifact path for a conversation
- **THEN** the system MUST allow access only if the requester is authorized for that Agent conversation
- **AND** MUST reject path traversal outside that conversation’s artifact root

### Requirement: Headless OpenCode permission asks are auto-approved

The system SHALL reply to OpenCode permission prompts during Agent chat. OpenCode `serve` has no TUI; an unanswered `ask` leaves the mapped session busy and the Bowi AI turn without an assistant message. Two conversations MUST be able to run concurrently without sharing a permission UI.

#### Scenario: Permission ask during a turn is answered

- **WHEN** OpenCode emits `permission.asked` or `permission.v2.asked` for the mapped session
- **THEN** Bowi AI MUST reply `always` so the tool call can continue
- **AND** MUST NOT wait for a human approval in the Agent dialog

#### Scenario: Two conversations do not block each other on permission

- **WHEN** two OpenCode Agent conversations each trigger a permission ask
- **THEN** each session’s ask MUST be answered independently
- **AND** neither conversation MUST be aborted solely because the other is waiting

#### Scenario: Recover does not abort a permission wait

- **WHEN** a mapped OpenCode session has `finish: null` but a pending permission request
- **THEN** the system MUST approve the pending request
- **AND** MUST NOT treat that session as stuck-and-abortable
