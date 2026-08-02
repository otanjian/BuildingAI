# agent-chat-stream-stall-guard Specification

## Purpose
TBD - created by archiving change agent-chat-stream-stall-guard. Update Purpose after archive.
## Requirements
### Requirement: Server aborts idle agent chat streams

The system SHALL abort an in-progress agent chat stream when no stream chunk has been emitted for longer than the configured idle timeout after streaming has started.

#### Scenario: Idle timeout fires after tool step

- **WHEN** an agent chat stream has started and the last emitted chunk is older than `streamIdleTimeoutMs` (default 90000)
- **THEN** the server aborts the generation and the client receives a terminal error indicating the stream stalled due to inactivity

#### Scenario: Idle timeout disabled

- **WHEN** `toolConfig.streamIdleTimeoutMs` is `0`
- **THEN** the server SHALL NOT abort the stream solely due to idle time

#### Scenario: Activity resets the idle timer

- **WHEN** any UI message stream chunk is emitted (including reasoning, tool, or text deltas)
- **THEN** the idle watchdog timer SHALL reset

### Requirement: Client surfaces stalled stream recovery

The agent chat UI SHALL detect a stalled streaming turn and show recoverable guidance when streaming appears active but no progress arrives for a client threshold (default ≥ server idle).

#### Scenario: Stuck thinking with no new progress

- **WHEN** the assistant turn is streaming and no stream progress is observed for the client stall threshold
- **THEN** the UI shows that the reply may be interrupted and prompts the user to stop and retry

#### Scenario: Normal slow but active stream

- **WHEN** stream chunks continue to arrive within the threshold
- **THEN** the UI SHALL NOT show the stalled-stream recovery banner

