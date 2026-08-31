# agent-multi-conversation-live-streams Specification

## Purpose
Enables multiple agent conversations to keep receiving live stream updates in parallel by retaining a Chat per conversation and treating focus changes as view switches only.
## Requirements
### Requirement: Per-conversation live stream registry

The client SHALL maintain an independent live stream consumer (Chat) for each agent conversation that has an in-flight assistant turn, so stream updates for one conversation MUST NOT depend on that conversation remaining focused in the UI.

#### Scenario: Second conversation starts while first is streaming

- **WHEN** the user has conversation A streaming and sends a message in conversation B
- **THEN** conversation A MUST continue receiving and applying stream updates into A's message state
- **AND** conversation B MUST receive and apply its own stream updates into B's message state

#### Scenario: Switch focus does not stop other streams

- **WHEN** the user switches the visible conversation from A to B while A is still streaming
- **THEN** the system MUST NOT abort A's in-flight stream solely because of the focus change
- **AND** A's message state MUST keep updating from its stream while B is visible

### Requirement: Focus switches view only

When the user changes the active conversation, the system SHALL bind the main chat transcript to that conversation's existing live message state when present, instead of discarding the previous conversation's live Chat solely to show the new one.

#### Scenario: Return to a still-streaming conversation

- **WHEN** conversation A is streaming in the background and the user focuses A again
- **THEN** the main transcript MUST show A's current streamed messages (including partial assistant/tool progress already applied to A's state)
- **AND** MUST NOT require waiting for Bowi AI persistence to finish before showing that progress
- **AND** MUST NOT replace A's live messages with a persisted history page while A still has in-memory live messages

#### Scenario: Live assistant with unknown parent keeps history visible

- **WHEN** a live or rehydrated assistant message is imported whose `parentId` does not match any message already in the transcript tree
- **THEN** the system MUST attach that assistant to the latest user message on the current branch when it is a newer turn
- **AND** MUST NOT create a second root branch that hides prior user messages and history

#### Scenario: Focus idle conversation

- **WHEN** the user focuses a conversation with no in-flight live Chat
- **THEN** the system MUST show that conversation's Bowi AI-persisted messages as today
- **AND** MUST NOT abort other conversations' live streams

### Requirement: Stream callbacks are scoped to their conversation

Stream lifecycle callbacks (data parts, finish, error, generating registration) SHALL be attributed to the conversation that owns the stream, not to whichever conversation is currently focused.

#### Scenario: Background stream completes

- **WHEN** a background conversation's stream finishes while another conversation is focused
- **THEN** the system MUST clear generating state for the completed conversation only
- **AND** MUST NOT clear generating state or inject errors into the focused conversation

#### Scenario: Background stream errors

- **WHEN** a background conversation's stream errors while another conversation is focused
- **THEN** the error MUST be recorded against the background conversation's message state
- **AND** MUST NOT replace or error the focused conversation's transcript

### Requirement: Concurrent live stream limit

The system SHALL enforce a maximum number of simultaneous live conversation streams per agent chat page session so browser connection limits are not exhausted.

#### Scenario: Cap reached

- **WHEN** the user attempts to start a new streaming turn and the concurrent live stream cap is already reached
- **THEN** the system MUST refuse or defer starting that additional live stream with a clear user-visible reason
- **AND** MUST leave already-running conversation streams uninterrupted

### Requirement: OpenCode rehydrate when registry Chat is missing

For OpenCode agents, when the user focuses a conversation whose server turn is still running but the client has no live Chat for that conversation (for example after refresh), the system SHALL rehydrate live progress for that conversation using the OpenCode session event or message path without aborting the server turn.

#### Scenario: Refresh during OpenCode turn then refocus

- **WHEN** the user refreshes the page while an OpenCode conversation turn is running
- **AND** later focuses that conversation
- **THEN** the system MUST show live OpenCode progress for that conversation until the turn settles
- **AND** MUST NOT treat focus alone as an explicit Stop

### Requirement: Detail and site-chat parity

Agent detail chat and public site-chat SHALL both provide per-conversation live stream retention and focus-as-view-switch behavior described in this capability.

#### Scenario: Site-chat parallel streams

- **WHEN** a user on the public agent chat starts streams in two conversations and switches between them
- **THEN** each conversation MUST keep receiving its stream updates as on the authenticated detail chat
