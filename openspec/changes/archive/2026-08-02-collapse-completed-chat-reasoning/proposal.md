## Why

Long agent turns emit many discrete reasoning steps. Each “Thought for N seconds” row stays visible even when collapsed, so the chat fills with thinking chrome and buries tools and the answer. Why now: OpenCode-style multi-step agents already produce this pattern, and completed tool calls already use a single summary toggle—reasoning should match.

## What Changes

- Group finished reasoning steps behind one “已完成 N 个思考过程” toggle (default collapsed).
- Keep only the in-progress reasoning step expanded by default while streaming.
- After the turn ends, all reasoning sits in the collapsed completed group (user can expand).
- Individual reasoning bodies remain readable when the group or active step is opened.

## Capabilities

### New Capabilities

- `collapse-completed-chat-reasoning`: Collapse completed assistant reasoning parts into a single expandable summary; only the active (streaming) reasoning step stays open by default.

### Modified Capabilities

- (none)

## Impact

- Client `ask-assistant-ui` message rendering only (`message.tsx` and a small helper/tests).
- No API, persistence, or provider protocol changes.
- Reuses the existing `Task` collapse pattern from completed tool calls.

## Non-goals

- Changing reasoning content, duration calculation, or provider metadata.
- Interleaving reasoning with tools in chronological part order (current message layout keeps reasoning above tools).
- Changing the shared `Reasoning` primitive’s auto-close timing beyond what the message-level grouping needs.
