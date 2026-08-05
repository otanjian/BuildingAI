## Purpose

Provides per-agent configurable sensitive-word replacement applied to AI agent replies, ensuring streaming output and persisted chat history both show the replaced text.

## Requirements

### Requirement: Per-agent sensitive word configuration
The system SHALL support a per-agent sensitive word configuration including an enable switch, a list of sensitive words, a configurable replacement string (default `***`), and a flag controlling whether the model's reasoning output is also filtered. The configuration SHALL be part of the agent's own settings.

#### Scenario: Configure sensitive words for an agent
- **WHEN** an administrator saves a sensitive word config for an agent with the enabled flag on, a word list, and a custom replacement string
- **THEN** the config is persisted on the agent and returned when the agent detail is loaded

#### Scenario: Disable filtering
- **WHEN** an administrator turns off the sensitive word config for an agent
- **THEN** the agent's replies are not filtered

### Requirement: Filter AI assistant reply text
The system SHALL replace all configured sensitive words in the assistant's reply text with the configured replacement string before the text reaches the user, for every agent type (opencode, coze, dify, and direct agents).

#### Scenario: Sensitive word in a single-turn reply
- **WHEN** a configured sensitive word appears in the assistant reply
- **THEN** every occurrence of the word in the reply text is replaced with the replacement string

#### Scenario: Sensitive word spanning streamed deltas
- **WHEN** a sensitive word is split across two or more streamed chunks
- **THEN** the word is still fully replaced and no partial occurrence is shown to the user

#### Scenario: Case-insensitive matching
- **WHEN** a sensitive word is configured in Latin characters and the reply contains it with different letter casing
- **THEN** all casing variants of the word are replaced

#### Scenario: Overlapping sensitive words
- **WHEN** two configured words overlap in the reply text
- **THEN** the longest match is preferred and replaced once

#### Scenario: Filtering disabled for an agent
- **WHEN** an agent has no sensitive word config or the enabled flag is off
- **THEN** the assistant reply is passed through unchanged

### Requirement: Filter reasoning output
The system SHALL apply the same replacement to the assistant's reasoning (deep-thinking) output when the agent's config enables it, and SHALL leave it untouched when disabled.

#### Scenario: Reasoning filtering enabled
- **WHEN** an agent config enables filtering of reasoning and the reasoning text contains a sensitive word
- **THEN** the sensitive word is replaced in the reasoning text as well

#### Scenario: Reasoning filtering disabled
- **WHEN** an agent config disables reasoning filtering and the reasoning text contains a sensitive word
- **THEN** the reasoning text is streamed and persisted unchanged

### Requirement: Streaming output matches persisted history
The system SHALL persist exactly the filtered text that was streamed to the user, so that reloading the conversation history shows the same replaced content.

#### Scenario: Reload conversation after filtered reply
- **WHEN** a user reloads a conversation containing an assistant reply that was filtered
- **THEN** the history shows the replaced text identical to what was streamed live

### Requirement: Out-of-scope content is not filtered
The system SHALL NOT modify tool call inputs/outputs, generated HTML artifact files, or the user's own input messages.

#### Scenario: Tool call content passes through unchanged
- **WHEN** an assistant message includes tool call input or output parts
- **THEN** those parts are streamed and persisted without replacement

#### Scenario: User input passes through unchanged
- **WHEN** a user sends a message containing a configured sensitive word
- **THEN** the user message is stored and displayed without replacement
