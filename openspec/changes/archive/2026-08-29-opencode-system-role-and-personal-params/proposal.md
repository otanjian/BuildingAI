## Why

OpenCode chat currently sends only hardcoded artifact-isolation instructions as `system`, discarding the agent's configured `rolePrompt`. Account-level personal parameters (code + value) are stored under settings but never reach OpenCode. Persona and connection-style parameters therefore have no effect in OpenCode sessions — a correctness gap for agents that rely on role and personal params (e.g. SAP assistants).

**Why now:** OpenCode is already the execution path for these agents; without system context, role and personal settings are misleadingly unused.

## What Changes

- Merge `agent.rolePrompt` into the OpenCode `promptAsync` `system` payload (before the existing artifact isolation hint).
- For authenticated users, load `personalParams` from the user dictionary and append a dedicated system section that lists each parameter **code and value** (approach A: whole table in system, not `{{code}}` template substitution into `rolePrompt`).
- Keep empty `rolePrompt` / empty personal-params table behavior identical to today (artifact hint only).
- Add unit coverage that `promptAsync` receives the merged `system` string.

## Non-goals

- Mapping `openingStatement` or `quickCommands` into system.
- Substituting personal params into `rolePrompt` via `{{参数编码}}` (approach B).
- Changing Coze / Dify / built-in provider prompt assembly.
- New public REST APIs or settings UI changes (reuse existing personal-params storage).

## Capabilities

### New Capabilities

- `opencode-system-prompt-context`: OpenCode turns receive merged system context from agent role prompt and account personal parameters.

### Modified Capabilities

- (none)

## Impact

- `packages/api/.../providers/opencode-chat.provider.ts` — build merged `system` before `promptAsync`.
- Likely inject `UserDictService` (or equivalent) into the OpenCode provider to read `personalParams` by `userId`.
- Unit tests around system assembly / `promptAsync` args.
- No client or schema migrations.
