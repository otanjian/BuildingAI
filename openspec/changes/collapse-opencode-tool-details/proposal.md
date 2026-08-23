## Why

Embedded OpenCode conversations currently expose large `Shell` and file-edit (`写入` / `Write`)
tool bodies immediately, so routine tool activity pushes the answer far down the timeline. Why now:
the BuildingAI embed is the primary agent experience and the screenshot shows these details should be
available on demand without occupying the default conversation view.

## What Changes

- Keep tool headers, status, and short command/file summaries visible in the conversation timeline.
- Render shell output, file-edit/write/patch contents, and other expandable tool bodies collapsed by
  default, including completed and currently streaming tool calls.
- Let users click or keyboard-activate each tool header to expand its details, preserving the current
  tool body and interactions once opened.
- Keep unrelated controls (reasoning summaries, context-tool groups, todos, questions, and direct
  OpenCode routes) unchanged unless their existing settings already control them.

**Non-goals:** changing tool execution, output persistence, tool ordering, labels/localization, or
the global preference that advanced OpenCode users may use to opt into expanded tool parts outside
the BuildingAI embed.

## Capabilities

### New Capabilities

- `opencode-tool-details`: Default-collapsed shell and file-write/edit tool details with accessible
  user-controlled expansion.

### Modified Capabilities

- None.

## Impact

- OpenCode `session-ui` tool disclosure defaults and focused unit tests.
- OpenCode app timeline wiring so the BuildingAI embed always passes collapsed defaults while direct
  OpenCode routes retain their configured preferences.
- The managed OpenCode web/runtime bundle must be rebuilt for the embedded iframe to receive the fix;
  no BuildingAI API, database, or protocol changes are required.
