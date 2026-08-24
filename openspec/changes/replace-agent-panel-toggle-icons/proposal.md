## Why

The agent conversation header uses list/tree metaphors for controls that actually show and hide the
left information panel and right workspace panel. The requested window-panel icon style makes those
actions easier to recognize and visually aligns them with the provided reference.

Why now: both controls are prominent in the current OpenCode agent header, so the mismatch is
visible on every conversation.

## What Changes

- Replace the desktop left information/history panel toggle icon with a left-side panel icon.
- Replace the desktop right workspace panel toggle icon with the mirrored right-side panel icon.
- Preserve the existing click handlers, labels, responsive visibility, panel state, and all other
  header controls.
- Non-goals: no layout, color, sizing, navigation, panel behavior, or mobile-menu changes.

## Capabilities

### New Capabilities

- `agent-panel-toggle-icons`: Defines the visual semantics and unchanged behavior of the agent
  header's left and right panel toggles.

### Modified Capabilities

None.

## Impact

- Affected code: agent chat header and OpenCode workspace action in `packages/client`.
- No API, persistence, dependency, or runtime protocol changes.
