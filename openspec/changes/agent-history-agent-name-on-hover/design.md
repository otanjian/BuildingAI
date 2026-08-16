## Context

Unified chat history in the default web layout sidebar lists agent conversations as `agentName + title`. Explore decided: default show title only; on hover reveal agent name inline (Option A); preserve accessibility; sync the command dialog list.

## Goals / Non-Goals

**Goals:**

- Reduce visual clutter in the narrow sidebar history list
- Reveal agent context on hover without leaving the row
- Screen readers still hear the agent name
- Same behavior in sidebar sub-items and the history command dialog

**Non-Goals:**

- Tooltip-only reveal
- Changing history data model or APIs
- Changing agent detail chat page's own history panel (already title-only)
- Mobile touch "hover" polyfill beyond CSS `:hover` / `group-hover`

## Decisions

1. **Inline fade-in before title** — matches today's layout; accept brief truncation shift on hover.
2. **CSS `group-hover` + `sr-only`** — no JS hover state; `sr-only` keeps agent name in the accessibility tree when visually hidden.
3. **Shared presentational snippet** — extract a tiny `AgentHistoryTitle` (or equivalent) used by both `ConversationSubItem` and `HistoryCommandItem` to avoid drift.
4. **Dialog sync** — apply the same pattern in `HistoryCommandItem` for one mental model.

## Risks / Trade-offs

- Hover truncates title further in narrow sidebar — acceptable for this UX.
- Touch devices without hover never see agent name visually — mitigated by `sr-only` / full accessible name; users can open the conversation to see agent context.

## Migration Plan

None — pure UI behavior change.
