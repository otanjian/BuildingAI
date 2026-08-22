## Why

The agent summary currently counts every non-deleted conversation, while the history panel hides
archived conversations. In the affected signed-in account this makes the UI show “113 conversations”
while only 11 active records are available in history. The summary must match the records users can
actually browse.

## What Changes

- Make the published agent conversation and message counters use the same active, non-debug,
  non-archived scope as the history list.
- Keep archived conversations hidden from the default history and counters while preserving the
  existing archive behavior.
- Add regression coverage for archived and debug records.

## Capabilities

### New Capabilities

- `agent-conversation-stats`: Agent summary counters reflect the default visible conversation
  history.

### Modified Capabilities

## Impact

- Published agent detail statistics in `packages/api`.
- Service-level tests for conversation statistics.
- No database schema or API shape changes.

## Non-goals

- Restoring or deleting archived conversations.
- Changing pagination or message-list behavior.
- Changing the meaning of the separate logs view, which can still include archived/debug records.
