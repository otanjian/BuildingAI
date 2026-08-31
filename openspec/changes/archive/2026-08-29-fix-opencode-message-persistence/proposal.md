## Why

OpenCode responses can contain NUL/control characters from terminal or tool output. PostgreSQL rejects those characters in JSONB, so the user sees a streamed answer that disappears after refresh and the conversation is left without an assistant record. This needs fixing now because the screenshot reproduces a real production-path persistence failure.

## What Changes

- Sanitize assistant message payloads before JSONB persistence while preserving readable content and structured tool metadata.
- Make sanitization recursive across message text, reasoning, tool input/output, and nested metadata values.
- Add a persistence regression test for NUL characters and ensure a failed assistant write cannot silently remove the visible terminal state.
- Keep the raw OpenCode runtime payload out of logs and preserve existing sensitive-word filtering.

### Non-goals

- No change to OpenCode execution, timeout policy, billing, or terminal-turn ownership.
- No migration or destructive rewrite of existing historical messages.
- No change to Dify, Coze, or native provider behavior.

## Capabilities

### New Capabilities

- `opencode-message-persistence`: OpenCode assistant messages remain reloadable after terminal/tool output contains database-invalid control characters.

### Modified Capabilities

- `chat-processing-indicator`: terminal OpenCode turns must not leave a streamed-only assistant state when persistence encounters invalid characters.

## Impact

- API OpenCode provider and chat-message persistence utilities.
- API unit tests and OpenSpec regression coverage.
- PostgreSQL JSONB writes become tolerant of invalid control characters without exposing content in telemetry.
