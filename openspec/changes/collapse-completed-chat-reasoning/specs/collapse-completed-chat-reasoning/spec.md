## ADDED Requirements

### Requirement: Completed reasoning steps collapse into one summary

The chat UI MUST group finished assistant reasoning steps behind a single expandable summary so completed thinking does not occupy one visible row per step.

#### Scenario: Multiple completed reasoning steps after the turn
- **WHEN** an assistant message has two or more reasoning parts and none of them are actively streaming
- **THEN** the UI shows one collapsed summary indicating how many thinking steps completed
- **AND** expanding the summary reveals the individual reasoning steps

#### Scenario: Single completed reasoning step
- **WHEN** an assistant message has exactly one completed reasoning part and no active reasoning
- **THEN** that step is still presented inside the completed summary (default collapsed)

### Requirement: Only active reasoning is open by default

While a turn is streaming, the UI MUST keep only the currently active reasoning step expanded by default; completed steps MUST remain in the collapsed summary.

#### Scenario: Streaming with prior completed thoughts
- **WHEN** the assistant message is streaming and earlier reasoning parts are done while a later reasoning part is still active
- **THEN** completed steps appear under the collapsed summary
- **AND** the active reasoning step is shown outside the summary and is open by default

#### Scenario: No active reasoning mid-turn
- **WHEN** the assistant message is still streaming but no reasoning part is currently active (e.g. tools or answer text are in progress)
- **THEN** only the completed reasoning summary is shown for thinking (default collapsed)
- **AND** no reasoning step is open by default
