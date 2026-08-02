## Why

While an agent turn is still running, users often see thinking/tool output with a large empty gap above the input and no clear signal that work is continuing. That makes the chat feel stalled, especially once the empty-state pulse indicator is hidden.

Why now: public and agent chat already stream long tool loops; a persistent in-progress cue is a small UX fix with high clarity.

## What Changes

- Show a dynamic “正在处理...” indicator under the active assistant turn while the conversation status is `submitted` or `streaming`.
- Hide the indicator when the turn finishes (`ready` / `error`) or the stream stops.
- Keep the existing empty-message pulse; the new label covers mid-turn gaps after reasoning/tools/text appear.

## Non-goals

- No backend/API changes.
- No changes to tool status badges or Reasoning “Thinking...” copy.
- No redesign of PromptInput layout beyond reserving space for this cue.

## Capabilities

### New Capabilities

- `chat-processing-indicator`: In-progress visual cue for agent chat while a turn is not complete.

### Modified Capabilities

- (none)

## Impact

- Client chat UI: `ask-assistant-ui` message rendering and/or site/agent chat shells that host `PromptInput`.
- Shared UI primitives may reuse existing `Shimmer` / pulse styles.
