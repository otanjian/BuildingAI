## ADDED Requirements

### Requirement: Agent context compression before model call

Agent chat MUST compress conversation UI messages when `contextConfig` indicates the context is oversized, before converting messages for the model.

#### Scenario: Sliding window when strategy is sliding_window or summary unavailable

- **WHEN** `truncationStrategy` is `sliding_window` OR summary generation fails
- **AND** message count exceeds `maxContextMessages`
- **THEN** the service keeps the most recent messages up to `maxContextMessages` (preserving the latest user message when possible)

#### Scenario: Summary compression when strategy is summary

- **WHEN** `truncationStrategy` is `summary`
- **AND** message count exceeds `maxContextMessages` (or estimated tokens exceed `maxContextTokens` when set)
- **THEN** older messages are summarized into a single summary message
- **AND** recent messages are kept verbatim after the summary
- **AND** the summary call uses the agent memory model when configured, otherwise the chat model

#### Scenario: No compression under limit

- **WHEN** message count is within `maxContextMessages` and token estimate is within `maxContextTokens` (if set)
- **THEN** messages are passed through unchanged
