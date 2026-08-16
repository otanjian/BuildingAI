## Purpose

Ensures OpenCode agent turns keep running and persist into BuildingAI after the browser HTTP stream disconnects, and recovers OpenCode sessions that hang mid-turn or finish ahead of BuildingAI so conversations stay usable and history is not stuck on false Aborted/timeout states.

## ADDED Requirements

### Requirement: OpenCode turn outlives passive HTTP disconnect

For an OpenCode agent conversation turn, the system SHALL continue the remote OpenCode session work and SHALL persist the turn outcome to BuildingAI storage even when the initiating HTTP stream ends due to passive disconnect (refresh, tab close, network loss, or proxy dropping the SSE), unless the user explicitly stops the turn.

#### Scenario: Refresh during an in-flight OpenCode turn

- **WHEN** a user refreshes the page while an OpenCode turn is still running
- **THEN** the system MUST NOT treat that disconnect as a user stop
- **AND** MUST NOT call OpenCode session abort solely because of that disconnect
- **AND** MUST persist the eventual assistant result (or a true remote error) to BuildingAI after the turn settles

#### Scenario: Reopen after disconnect shows persisted result

- **WHEN** the detached turn finishes and the user reopens the same conversation
- **THEN** the system MUST show the persisted BuildingAI messages for that turn without requiring OpenCode history as the UI source of truth

### Requirement: Explicit stop aborts OpenCode

The system SHALL abort the mapped OpenCode session and end the server-owned turn only when the user explicitly requests stop (or an equivalent abort intent), not merely when the HTTP subscription ends.

#### Scenario: User stops generation

- **WHEN** the user explicitly stops an in-flight OpenCode turn
- **THEN** the system MUST request abort on the mapped OpenCode session
- **AND** MUST mark the BuildingAI turn as stopped/aborted accordingly

#### Scenario: Passive disconnect is not stop

- **WHEN** the HTTP stream ends without an explicit stop intent
- **THEN** the system MUST keep the server-owned turn running until settle, cancel, or safety timeout

### Requirement: Persist before advertising completion

When a detached OpenCode turn settles successfully or with a handled error/stop/timeout, the system SHALL persist BuildingAI messages for that turn before treating the turn as complete for clients (stream finish for live subscribers, and clearing in-flight status for reopen/list).

#### Scenario: Live subscriber receives finish after persist

- **WHEN** a client is still subscribed to the turn stream when the turn settles
- **THEN** the system MUST persist messages before emitting the stream finish signal

#### Scenario: No live subscriber still persists

- **WHEN** no client is subscribed when the turn settles
- **THEN** the system MUST still persist the turn messages to BuildingAI

### Requirement: In-flight turn visibility survives refresh

While a server-owned OpenCode turn is in progress for a conversation, the system SHALL expose an in-flight indicator that remains correct after a full page refresh (not only via ephemeral client memory).

#### Scenario: Sidebar after refresh

- **WHEN** a conversation has a running server-owned OpenCode turn and the user refreshes
- **THEN** the conversation history UI MUST still indicate that conversation is generating until the turn completes or is stopped

#### Scenario: Indicator clears after persist

- **WHEN** the server-owned turn finishes and messages are persisted
- **THEN** the in-flight indicator for that conversation MUST clear without requiring a manual hard reload beyond normal list/message refresh behavior

### Requirement: One active OpenCode turn per conversation

The system SHALL allow at most one active server-owned OpenCode turn per BuildingAI conversation at a time.

#### Scenario: Second send while turn running

- **WHEN** a user sends another message to a conversation that already has a running OpenCode turn
- **THEN** the system MUST reject or otherwise prevent starting a overlapping turn on that conversation
- **AND** MUST leave the existing turn running unless the user explicitly stops it

### Requirement: Safety timeout aborts stuck OpenCode work

When the server-owned turn hits its safety timeout, the system SHALL persist a timeout outcome to BuildingAI and SHALL best-effort abort the mapped OpenCode session so the remote session does not remain stuck mid-tool.

#### Scenario: Timeout clears OpenCode hang

- **WHEN** the OpenCode turn exceeds the configured safety timeout while OpenCode has not emitted session idle
- **THEN** the system MUST mark the BuildingAI turn as timed out (or equivalent)
- **AND** MUST attempt to abort the mapped OpenCode session

### Requirement: Recover stuck or ahead-of-BA OpenCode sessions

The system SHALL recover a mapped OpenCode session that is stuck mid-turn or that completed a turn BuildingAI did not persist, when the user reopens the conversation or before the next send on that conversation.

#### Scenario: Abort hung OpenCode session on reopen

- **WHEN** the user reopens a conversation whose mapped OpenCode session still has unfinished mid-turn work (for example last assistant without finish) after BuildingAI already timed out or aborted
- **THEN** the system MUST attempt to abort that OpenCode session
- **AND** MUST clear the BuildingAI in-flight indicator for that conversation

#### Scenario: Thin-heal missing assistant from OpenCode

- **WHEN** OpenCode has a completed assistant turn for the conversation that BuildingAI lacks (or BuildingAI only stored a timeout/Aborted placeholder for that user turn)
- **THEN** on reopen or before the next send the system MUST best-effort persist a BuildingAI assistant message filled from that OpenCode turn (gap fill only)
- **AND** MUST NOT rewrite the entire OpenCode session history into BuildingAI

#### Scenario: Pre-send unblocks a stuck session

- **WHEN** the user sends a new message and the mapped OpenCode session is still stuck from a prior turn
- **THEN** the system MUST recover (abort and optional thin-heal) before starting the new OpenCode prompt
- **AND** MUST then proceed with at most one new active turn
