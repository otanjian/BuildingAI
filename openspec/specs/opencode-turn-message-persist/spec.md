# opencode-turn-message-persist Specification

## Purpose
Ensures OpenCode Agent turns persist Bowi AI messages before the client treats the turn as finished, so reopening a conversation shows the latest rounds from Bowi AI storage.
## Requirements
### Requirement: Persist before stream finish

For an OpenCode Agent turn that saves conversation history, the system SHALL persist the turn’s user and assistant messages to Bowi AI storage before emitting the stream finish signal to the client.

#### Scenario: Reopen immediately after visible completion

- **WHEN** an OpenCode assistant reply has finished streaming to the client and the user reopens that conversation from the sidebar
- **THEN** the system MUST show the latest user and assistant turns loaded from Bowi AI storage

#### Scenario: Bowi AI remains source of truth

- **WHEN** a user reopens a past OpenCode Agent conversation
- **THEN** the system MUST load message history from Bowi AI storage and MUST NOT require reading OpenCode session history to display those turns

### Requirement: User message available if reopen mid-turn

For an OpenCode Agent turn that saves conversation history, the system SHALL persist the user message to Bowi AI early enough that a mid-turn reopen can show at least that user message even if the assistant reply is not yet complete.

#### Scenario: Reopen while assistant still generating

- **WHEN** the user sends a message to an OpenCode Agent, switches away, then reopens the same conversation before the assistant turn completes
- **THEN** the conversation view MUST include the user’s message from Bowi AI storage

### Requirement: Refresh visible conversation after background persist

When a background OpenCode (or Agent) stream finishes for the conversation the user is currently viewing, the system SHALL refresh that conversation’s messages from Bowi AI so a load that raced ahead of persistence is corrected without a full page reload.

#### Scenario: Active conversation heals after late persist

- **WHEN** the user is viewing a conversation whose background stream has just finished persisting
- **THEN** the message pane MUST update to include the persisted latest turns
