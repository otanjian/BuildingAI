# agent-conversation-background-stream Specification

## Purpose

When the user starts a new conversation or switches to another conversation while the previous one is still streaming, the in-flight stream SHALL continue running in the background and complete normally, instead of being aborted mid-generation.

## ADDED Requirements

### Requirement: New conversation does not abort the previous stream

When the user starts a new conversation or opens a different historical conversation while the current conversation is still streaming, the system SHALL NOT abort the in-flight stream. The previous conversation SHALL continue generating in the background and persist its complete result.

#### Scenario: Start new conversation while streaming

- **WHEN** the user clicks "新对话" while the current conversation is still streaming
- **THEN** the streaming request for the previous conversation continues in the background
- **AND** the new conversation UI starts with an empty thread
- **AND** the previous conversation eventually completes and persists its full assistant message

#### Scenario: Open another historical conversation while streaming

- **WHEN** the user opens a different historical conversation while the current one is streaming
- **THEN** the in-flight stream for the previously open conversation is not aborted
- **AND** the opened conversation loads its own history independently

### Requirement: Background stream completion is reflected in conversation history

The agent conversation history list SHALL indicate when a conversation still has an in-flight background stream, and SHALL refresh to show the completed conversation afterward.

#### Scenario: History shows generating state

- **WHEN** a conversation has an in-flight background stream
- **THEN** the history list SHALL mark that conversation as generating/streaming

#### Scenario: History refreshes after completion

- **WHEN** the background stream finishes
- **THEN** the history list SHALL invalidate and re-fetch so the conversation reflects its final message count and title

### Requirement: Returning to a conversation shows its complete result

When the user navigates back to a conversation whose stream completed in the background, the chat thread SHALL load the persisted, complete messages.

#### Scenario: Reopen conversation after background completion

- **WHEN** the user reopens a conversation after its background stream completed
- **THEN** the chat thread displays the full persisted message history including the completed assistant reply

#### Scenario: Regenerate or continue from a background-completed conversation

- **WHEN** the user sends a new message or regenerates a reply in a conversation that previously completed in the background
- **THEN** the request includes the correct parent message id from the persisted history

### Requirement: Background stream events do not leak into the visible conversation

While a background stream is running, events emitted by that stream SHALL NOT affect the currently visible conversation's UI state, navigation, or message store.

#### Scenario: Background conversation id does not navigate the current view

- **WHEN** a background stream emits a `data-conversation-id` event
- **THEN** the browser does not navigate to that conversation

#### Scenario: Background message ids do not pollute the visible thread

- **WHEN** a background stream emits `data-user-message-id` or `data-assistant-message-id` events
- **THEN** those ids are not mapped into the currently visible conversation's message store

#### Scenario: Background completion does not hydrate the visible conversation usage

- **WHEN** a background stream finishes
- **THEN** its usage hydration is skipped or applied only to the conversation it belongs to
