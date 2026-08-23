## Why

OpenCode conversations created from the embedded agent workbench remain labeled “新对话” after the
first user message, making the history difficult to identify. The Workspace action also covers the
conversation with an overlay instead of preserving both contexts side by side.

### Why now

Both issues affect the primary OpenCode workbench flow and force users to refresh, manually rename,
or repeatedly close the workspace while working.

## What Changes

- Generate a meaningful title for a newly used OpenCode conversation and keep the BuildingAI
  conversation history synchronized without a full-page refresh.
- Open Workspace as a collapsible panel embedded on the right side of the conversation instead of as
  an overlay above it.
- Keep the active conversation and workspace state intact while the panel is opened, resized, or
  closed.

### Non-goals

- Redesigning the workspace file browser or changing its file APIs.
- Changing title behavior for non-OpenCode agent modes.
- Changing the standalone OpenCode application layout.

## Capabilities

### New Capabilities

- `opencode-title-inline-workspace`: Covers automatic OpenCode conversation titles and the inline
  right-side Workspace experience in the embedded agent workbench.

### Modified Capabilities

None.

## Impact

- OpenCode session creation/title synchronization in the Agent API integration.
- Agent conversation history cache and embedded OpenCode workbench UI.
- Desktop workbench panel layout and focused frontend/API tests.
