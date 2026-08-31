## MODIFIED Requirements

### Requirement: Show in-progress cue while agent turn is incomplete
The chat UI MUST show a dynamic “正在处理...” indicator under an active assistant turn while the conversation status is `submitted` or `streaming`; for durable OpenCode turns it MUST render the latest non-empty recoverable projection above the indicator and atomically replace that projection with the terminal persisted assistant message.

#### Scenario: Mid-stream after tools or text appear
- **WHEN** an assistant turn is streaming and the message already has reasoning, tools, or text
- **THEN** the UI displays an animated “正在处理...” indicator below that assistant content and above the input area

#### Scenario: Turn completes
- **WHEN** the conversation status becomes `ready` or `error`, or the stream is stopped
- **THEN** the “正在处理...” indicator is hidden

#### Scenario: Waiting after send
- **WHEN** the user has submitted a message and status is `submitted` before the final assistant response finishes
- **THEN** the “正在处理...” indicator remains visible for the in-progress turn

#### Scenario: Durable OpenCode projection advances
- **WHEN** a durable OpenCode turn receives a newer non-empty projection snapshot
- **THEN** the projected assistant content updates in place above the processing indicator without duplicating prior text or tools

#### Scenario: Durable OpenCode terminal message commits
- **WHEN** the durable OpenCode turn commits its terminal persisted assistant message
- **THEN** the UI replaces the live projection and processing indicator with that persisted message without showing an empty intermediate assistant state
