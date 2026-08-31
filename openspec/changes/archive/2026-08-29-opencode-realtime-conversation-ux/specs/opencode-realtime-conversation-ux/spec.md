## Purpose

Make durable OpenCode Agent conversations feel immediate during creation, navigation, background execution, refresh, and long-running tool work without giving the browser ownership of execution or final persistence.

## ADDED Requirements

### Requirement: New conversations have stable identity before first send
The OpenCode chat UI SHALL generate and navigate to a stable conversation UUID as soon as the user starts a new conversation, and SHALL reuse that UUID for the first durable turn.

#### Scenario: Start a new conversation
- **WHEN** the user selects “新对话” from an OpenCode Agent chat
- **THEN** the UI immediately navigates to a UUID-addressed empty conversation and focuses the composer without waiting for a server response

#### Scenario: Send the first message
- **WHEN** the user sends from a locally created empty conversation
- **THEN** the accepted durable turn uses the UUID already present in the route and no provisional conversation identity is rekeyed

#### Scenario: Abandon an empty draft conversation
- **WHEN** the user leaves a locally created conversation before sending a message
- **THEN** no server conversation is created and the disposable draft is removed from local history

### Requirement: Conversation state is isolated and cached by conversation
The OpenCode chat UI SHALL retain each recently accessed conversation's persisted messages, live projection, active-turn summary, composer draft, and scroll position independently, with bounded least-recently-used eviction.

#### Scenario: Switch between cached conversations
- **WHEN** the user switches from conversation A to cached conversation B
- **THEN** conversation B renders its own cached state immediately without first showing A, clearing to an empty pane, or waiting for history I/O

#### Scenario: Background reconciliation races a live message
- **WHEN** a history response arrives after a local user message or live projection was added
- **THEN** the UI reconciles by stable database or turn identity and preserves both valid persisted history and newer live state without duplication

#### Scenario: Cache exceeds its bound
- **WHEN** retained inactive conversations exceed the configured cache capacity
- **THEN** the least recently accessed inactive entries are evicted while the active conversation and conversations with active turns remain available

### Requirement: History navigation uses stale-while-revalidate
The OpenCode chat UI SHALL render cached history before performing a background authoritative refresh and SHALL prefetch likely conversation selections without blocking the current conversation.

#### Scenario: Open cached history
- **WHEN** the selected conversation has cached messages
- **THEN** the UI renders them immediately and reconciles a background refresh without a full-pane loading state

#### Scenario: Prefetch a history item
- **WHEN** the user hovers or keyboard-focuses a history item not currently cached
- **THEN** the UI starts a bounded first-page prefetch for that conversation and selection remains responsive

### Requirement: Active turns expose recoverable full projections
An authorized OpenCode turn event endpoint SHALL expose monotonically versioned full projection snapshots and a terminal event; reconnecting clients SHALL be able to resume from their last observed version.

#### Scenario: Receive live progress
- **WHEN** OpenCode emits new text, reasoning, or tool state for an active authorized turn
- **THEN** the client receives a complete projection snapshot with a version greater than the prior snapshot

#### Scenario: Reconnect after interruption
- **WHEN** a client reconnects with its last observed event version
- **THEN** the endpoint emits the latest newer snapshot, or waits for the next version, without requiring token-delta replay

#### Scenario: Turn reaches a terminal state
- **WHEN** the durable terminal transaction commits an assistant message
- **THEN** the event endpoint emits one terminal result identifying the final status and assistant message and the recoverable live projection is cleared

#### Scenario: Unauthorized projection request
- **WHEN** a caller requests events for a turn outside its agent, user, or anonymous ownership scope
- **THEN** the system rejects the request without exposing projection content or runtime configuration

### Requirement: Realtime delivery does not own execution
Failure, disconnection, duplication, or absence of the realtime projection channel SHALL NOT start, stop, repeat, complete, persist, or bill an OpenCode turn.

#### Scenario: Browser closes mid-turn
- **WHEN** the browser event connection closes while a turn is running
- **THEN** the durable worker continues and commits the turn independently

#### Scenario: Realtime channel is unavailable
- **WHEN** the event connection cannot be established or repeatedly disconnects
- **THEN** the client continues authoritative status observation with bounded backoff and eventually refreshes the terminal persisted message

#### Scenario: Duplicate or stale projection
- **WHEN** the client receives a projection version no newer than the one already rendered
- **THEN** the client ignores it and does not duplicate visible content

### Requirement: Runtime event fan-out is bounded
Each API process SHALL use at most one upstream OpenCode event connection per normalized runtime while it has interested active turns, fan events out by exact session identity, and stop idle runtime connections after a grace period.

#### Scenario: Multiple browsers watch one runtime
- **WHEN** multiple authorized clients observe turns on the same OpenCode runtime
- **THEN** they share one upstream runtime event connection while receiving only events for their authorized turns

#### Scenario: Last subscriber leaves
- **WHEN** a runtime has no active projection subscribers for the configured grace period
- **THEN** the API process closes its upstream event connection without affecting OpenCode execution

### Requirement: High-frequency and large projections remain responsive
The system SHALL batch projection refreshes, bound persisted and transmitted part payloads, and avoid rendering every history row outside the viewport.

#### Scenario: Burst of remote deltas
- **WHEN** many OpenCode events arrive within the projection batching window
- **THEN** the system publishes at most one consolidated snapshot for that window containing the latest state

#### Scenario: Oversized tool output
- **WHEN** a tool result exceeds the configured projection limit
- **THEN** the live projection retains identifying metadata and a bounded tail with an explicit truncation marker while the terminal persisted result follows its existing retention rules

#### Scenario: Large conversation history
- **WHEN** the history sidebar contains substantially more rows than fit in the viewport
- **THEN** only the visible range plus bounded overscan is mounted while keyboard and pointer selection remain available

### Requirement: Realtime UX is observable
The system SHALL record projection latency, connection and reconnect counts, status-poll fallback, projection truncation, and cache hit or miss signals without logging message content or credentials.

#### Scenario: Realtime fallback occurs
- **WHEN** an event connection fails and status polling continues the turn
- **THEN** telemetry records the fallback and latency outcome without recording prompt or assistant text
