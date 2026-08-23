## Why

The current OpenCode integration renders a second, partial chat surface inside BuildingAI. It
duplicates the composer and message timeline, cannot reliably reproduce OpenCode's question/task UI,
and loses parity whenever OpenCode changes its web client.

## What Changes

- Embed the OpenCode Web application in an iframe for agents whose `createMode` is `opencode`.
- Keep conversation ownership, history, routing, access checks, and the BuildingAI-to-OpenCode
  session binding in BuildingAI.
- Lazily create and persist one OpenCode session for a BuildingAI conversation before building the
  iframe URL, so a reload or conversation switch never creates an orphan session.
- Remove the OpenCode-only duplicate BuildingAI message list and composer from the OpenCode layout.
  The native OpenCode Web UI owns message rendering, questions, tasks, tools, and input.
- Keep direct, Dify, Coze, and other agent surfaces unchanged.

## Capabilities

### New Capabilities

- `opencode-iframe-session`: A BuildingAI-managed iframe entry point for the OpenCode Web UI.

### Modified Capabilities

None. Non-OpenCode chat behavior remains unchanged.

## Impact

- Backend conversation detail API and OpenCode session binding.
- Frontend OpenCode chat layout and iframe lifecycle.
- OpenSpec/API/client tests and runtime verification.
