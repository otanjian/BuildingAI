## Why

OpenCode can pause a turn with a structured question, but the BuildingAI worker currently rejects that request as unsupported. The agent conversation therefore has no way to show the question or continue the turn, while the native OpenCode interface works. This is urgent because workflows that need a user choice remain stuck or fail instead of behaving like the source OpenCode experience.

## What Changes

- Preserve the active OpenCode question in the durable turn projection so it survives polling and page refreshes.
- Keep the worker paused while a question is pending instead of rejecting and aborting the turn.
- Add authenticated reply and reject actions for the pending question.
- Render a shared question card in detail and public agent conversations, including single-select, multi-select, and custom answers.
- Clear the question after a successful answer/reject and resume normal turn reconciliation.
- Bridge the legacy streaming conversation route to the same question card and OpenCode reply/reject operations.

## Capabilities

### New Capabilities

- `opencode-interactive-questions`: Display and resolve OpenCode interactive questions in agent conversations.

### Modified Capabilities

- None.

## Impact

The API OpenCode integration, durable and legacy turn/status APIs, conversation metadata, shared client conversation store, and both authenticated and public chat surfaces are affected. No OpenCode server changes are required.

## Non-goals

- Changing OpenCode question wording or option semantics.
- Adding questions to unrelated providers.
