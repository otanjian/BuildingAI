## ADDED Requirements

### Requirement: Show in-progress cue while agent turn is incomplete
The chat UI MUST show a dynamic “正在处理...” indicator under the active assistant turn while the conversation status is `submitted` or `streaming`.

#### Scenario: Mid-stream after tools or text appear
- **WHEN** an assistant turn is streaming and the message already has reasoning, tools, or text
- **THEN** the UI displays an animated “正在处理...” indicator below that assistant content and above the input area

#### Scenario: Turn completes
- **WHEN** the conversation status becomes `ready` or `error`, or the stream is stopped
- **THEN** the “正在处理...” indicator is hidden

#### Scenario: Waiting after send
- **WHEN** the user has submitted a message and status is `submitted` before the final assistant response finishes
- **THEN** the “正在处理...” indicator remains visible for the in-progress turn
