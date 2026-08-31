# opencode-message-persistence Specification

## Purpose
Keep OpenCode assistant turns reloadable when terminal or tool output contains characters that PostgreSQL JSONB cannot represent, while preserving the turn's terminal status and user-visible error semantics.
## Requirements
### Requirement: Persist sanitized assistant messages

The system SHALL remove database-invalid control characters from OpenCode assistant message payloads before persistence, recursively covering text, reasoning, tool data, and nested metadata while retaining valid content and structure.

#### Scenario: NUL appears in tool output

- **WHEN** an OpenCode assistant message contains a NUL character in any nested part
- **THEN** the persisted JSONB message contains no NUL character, remains valid JSONB, and retains the surrounding readable content

#### Scenario: Valid content is persisted unchanged

- **WHEN** an OpenCode assistant message contains no database-invalid control characters
- **THEN** its role, parts, text, tool metadata, and usage fields are persisted without alteration

### Requirement: Terminal persistence failure is visible and recoverable

If assistant-message persistence still fails after sanitization, the system SHALL record a terminal failure state for the conversation and SHALL NOT leave the conversation appearing indefinitely active or silently discard the failure.

#### Scenario: Assistant write fails unexpectedly

- **WHEN** the terminal assistant message cannot be persisted for a reason other than invalid characters
- **THEN** the conversation has a terminal failure status and the client can reload that status without treating the turn as running

