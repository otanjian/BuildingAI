## Why

OpenCode agents now render the native OpenCode Web experience inside an iframe, so the first prompt bypasses BuildingAI's provider path. As a result, the OpenCode session does not receive the logged-in account or the user's personal parameters and asks again for SAP connection information.

**Why now:** SAP OpenCode sessions must be usable immediately after creation while preserving the existing BuildingAI session/history ownership and sensitive-word policy.

## What Changes

- Initialize every newly created OpenCode iframe session with the current login account and `personalParams` values.
- Apply the agent's configured sensitive-word replacement policy before context leaves BuildingAI.
- Store the sanitized context as session metadata and make OpenCode inject it into every model request as system context, without creating a visible bootstrap chat message.
- Keep existing sessions stable; only newly initialized or explicitly refreshed sessions receive the context snapshot.
- Never include the user's password or authentication token in the context.

## Capabilities

### New Capabilities

- `opencode-session-context`: OpenCode sessions created through BuildingAI receive sanitized account context and personal parameters as non-visible system context.

### Modified Capabilities

- None.

## Impact

- BuildingAI OpenCode embed-session controller and context utilities.
- OpenCode session metadata and runner system-context assembly.
- API and OpenCode runtime tests, plus local OpenCode rebuild/restart verification.
