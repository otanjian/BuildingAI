## Context

See `proposal.md` for motivation. OpenCode already recognizes the explicit `buildingaiEmbed=1` query marker in a shared utility. The session page independently derives review, file-browser, terminal, resize-handle, and width state, while the session timeline owns the title-row context/status and overflow controls. Panel state is persisted and can therefore be open when an embedded route mounts.

## Goals / Non-Goals

**Goals:**

- Use one pure embed-shell visibility decision at both rendering boundaries.
- Suppress every desktop secondary-panel variant without mutating persisted OpenCode preferences.
- Keep the conversation width calculation consistent with the actual rendered layout.
- Preserve the title and all direct-route behavior.

**Non-Goals:**

- Disable panel commands or delete the user's persisted panel state.
- Change mobile session navigation or assistant message content.
- Move these controls into BuildingAI as part of this change.

## Decisions

### Derive shell visibility from the existing explicit marker

Add a pure helper beside the existing BuildingAI embed utilities that returns whether session header actions and the secondary panel are visible. Both values are false only for the exact marker value `1`.

Alternative considered: infer embedding from iframe ancestry. This was rejected because it is harder to test, introduces cross-origin constraints, and would affect unmarked integrations.

### Gate computed layout state instead of applying CSS hiding

The session page will gate desktop review, terminal, and file-tree visibility before panel width, resize-handle, and stacked layout calculations run. This prevents rendering and returns the full width to the conversation.

Alternative considered: add embed-only CSS with `display: none`. This could leave the main panel at its persisted reduced width and keep hidden content mounted.

### Preserve persisted panel state

The embed will mask panel visibility rather than closing panel state. Opening the same route directly later therefore restores the user's normal OpenCode configuration.

## Risks / Trade-offs

- [Panel commands remain callable through shortcuts in the embed but have no visible desktop result] → Keep the change scoped to rendering; command removal would broaden behavior and can be addressed separately if desired.
- [A future secondary panel type bypasses the gated layout memos] → Cover the shared visibility decision and the aggregate panel layout in focused tests, and browser-check absence of the actual panel container.

## Migration Plan

Build the embedded OpenCode web UI into the workspace binary, wait for active sessions to become idle, restart the managed runtime, and verify the representative BuildingAI embed. Roll back by reverting the visibility gates and rebuilding; no persisted data migration is required.
