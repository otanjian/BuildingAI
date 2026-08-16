## Context

OpenCode agents already configure `thirdPartyIntegration` with `baseURL` + `workspace`. Chat streams via `OpencodeApiService`; HTML artifacts are proxied under `/ai-agents/:id/conversations/:conversationId/artifacts/*`. Agent chat header right side is mostly empty (form variables only). UI package already exports presentational `FileTree*` components with no data fetching.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Authenticated BuildingAI proxy for OpenCode `GET /file` and `GET /file/content`
- Chat UI toggle + right dock panel for OpenCode agents only
- Lazy directory load + read-only text preview using existing `FileTree` primitives

**Non-Goals:**

- Browser → OpenCode direct access
- File edit/save, git status colors, search UI
- Changing artifact HTML iframe behavior

## Decisions

### 1. API shape: agent-scoped workspace routes (not conversation-scoped)

- `GET /api/ai-agents/:id/opencode/workspace/files?path=`
- `GET /api/ai-agents/:id/opencode/workspace/files/content?path=`

**Rationale:** Workspace is agent config, not conversation. Conversation artifacts stay on the existing artifacts route.

**Alternatives:** Nest under conversation Id — rejected (same tree for all chats of the agent; extra path noise).

### 2. Server-side OpenCode proxy only

Extend `OpencodeApiService` with `listFiles` / `readFileContent`, reuse existing auth headers (`x-opencode-directory`, basic auth). Validate resolved paths stay under `path.resolve(workspace)`.

**Alternatives:** Client calls OpenCode — rejected (secrets, CORS, network exposure).

### 3. Filter ignored / noise on API response

Drop entries with OpenCode `ignored: true` and hard-filter basename set: `node_modules`, `.git`, `.DS_Store`, `dist`, `coverage` (configurable constant). Prefer API filter so UI stays dumb.

### 4. Right dock layout (push), not Sheet overlay

Chat main column stays flex-1; optional `aside` ~280–320px on the right when open. Panel state is local React state (session-only).

**Alternatives:** Sheet overlay — faster but less Cursor-like; deferred.

### 5. Preview: text-only MVP

Show content in a monospace scroll area. If OpenCode returns binary / error, show a short error message. No syntax highlighting requirement for MVP (nice-to-have if cheap).

### 6. Gate on `agent.createMode === "opencode"`

`PublishedAgentDetail` already includes `createMode`. No new publish fields required for MVP.

## Risks / Trade-offs

- **[Risk] Large directories / slow OpenCode** → Mitigation: list one directory at a time; no recursive fetch; UI loading state per expand.
- **[Risk] Path traversal** → Mitigation: resolve + prefix-check against workspace; reject `..` escapes.
- **[Risk] OpenCode down** → Mitigation: surface toast / inline error in panel; chat remains usable.
- **[Trade-off] Hard-coded noise filter** may hide useful dirs → Accept for MVP; can later expose allowlist.

## Migration Plan

- Deploy API + client together; feature is additive.
- Rollback: revert routes and UI; no DB migration.

## Open Questions

- None blocking; syntax highlighting can be a follow-up.
