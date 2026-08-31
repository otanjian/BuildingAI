## Why

Completed reasoning blocks in embedded OpenCode conversations still say “Thinking”, which makes
finished work look active and leaves users unsure whether the agent has stopped. Why now: the
BuildingAI iframe intentionally exposes reasoning summaries, so their lifecycle state must be
truthful and immediately scannable.

## What Changes

- Show the existing in-progress reasoning label while the assistant message is still streaming.
- Replace that label with a completed reasoning label as soon as the assistant message has a
  completion timestamp.
- Keep completed reasoning collapsed and in-progress reasoning expanded under the current embed
  behavior.
- Keep direct OpenCode routes and the iframe integration contract unchanged.

**Non-goals:** changing reasoning content, message completion semantics, tool status rendering,
session polling, or replacing the iframe.

## Capabilities

### New Capabilities

- `opencode-reasoning-status`: Lifecycle-accurate labels for reasoning summaries in the BuildingAI
  OpenCode embed.

### Modified Capabilities

- None.

## Impact

- OpenCode session-ui reasoning disclosure and shared UI localization dictionaries.
- Focused session-ui tests and the managed OpenCode web/runtime bundle used by BuildingAI.
- No BuildingAI API, database, billing, or protocol changes.
