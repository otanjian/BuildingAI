## Context

The session timeline renders a summary header and a file accordion for each completed turn. The app-local timeline implementation is the BuildingAI runtime path, while the shared session-turn component mirrors the same structure and styling. See `proposal.md` for motivation and the capability spec for observable behavior.

## Goals / Non-Goals

**Goals:**

- Introduce a group-level collapsed state whose default is closed.
- Make the whole summary header keyboard- and pointer-operable with an explicit expanded state.
- Keep the current per-file accordion and report preview behavior unchanged once visible.
- Keep app-local and shared session-turn presentations behaviorally aligned.

**Non-Goals:**

- Persisting expansion across reloads or conversations.
- Changing the existing ten-file display limit or individual diff expansion model.
- Changing artifact generation or report URLs.

## Decisions

### Use a native button for the group summary

The count, aggregate statistics, and a chevron will live in a full-width native button controlling the content region. A button gives keyboard activation, focus handling, and `aria-expanded` semantics without custom event emulation. A clickable `div` was rejected because it would require reconstructing native accessibility behavior.

### Unmount the file list while collapsed

The file accordion is rendered only when the group is expanded. This reduces initial timeline DOM and diff setup costs and makes the collapsed state unambiguous. CSS-only hiding was rejected because hidden file controls would remain easier to expose accidentally and would keep unnecessary component work alive.

### Retain two independent expansion layers

Group expansion controls whether file rows are visible; the existing per-file accordion continues to control diff bodies. The existing `showAll` state remains responsible only for the ten-file display limit. This separation avoids changing file-level semantics.

### Apply the behavior to both timeline implementations

The app-local component powers the current BuildingAI embed, while the shared session-turn component should retain parity for other consumers. Both use the same CSS contract, so the visual and accessibility behavior will be implemented consistently.

## Risks / Trade-offs

- [Users may miss changed files] → Keep count and aggregate statistics permanently visible and add a familiar chevron that reflects state.
- [Nested controls may conflict] → The group button exists only above the file list; per-file buttons and preview actions render outside it after expansion.
- [Collapsing discards an open diff's mounted view] → Preserve its selection state so reopening the group restores the same per-file expanded selection where component behavior permits.

## Migration Plan

Rebuild and restart the managed OpenCode runtime. Rollback is limited to restoring the prior timeline and shared component markup/styles and rebuilding the runtime; no data migration is required.
