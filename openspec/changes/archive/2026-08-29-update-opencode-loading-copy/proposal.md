## Why

The embedded OpenCode panel currently shows “正在打开 OpenCode 会话…” while the latest conversation
is being created or opened. This wording is too narrow for the observed flow, which can include
creating a new conversation as well as opening the newest one. Updating it now makes the loading
state match the user-facing behavior shown in the product UI.

## What Changes

- Replace the embedded OpenCode loading-overlay text with “正在新建/打开最新会话...”.
- Keep the existing spinner, layout, timing, and error handling unchanged.
- Leave unrelated processing and loading messages untouched.

## Capabilities

### New Capabilities

- `opencode-session-loading-copy`: define the user-facing cue shown while the embedded OpenCode
  session is created or opened.

### Modified Capabilities

- None.

## Impact

- Affected UI: `packages/client/src/pages/agents/detail/_components/opencode-iframe-panel.tsx`.
- A focused client-side regression test will protect the exact copy.
- No API, database, dependency, or routing changes.

## Non-goals

- No redesign of the loading overlay or spinner.
- No changes to the standard “正在处理...” assistant-turn indicator.
