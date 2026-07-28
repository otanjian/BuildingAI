## Context

BuildingAI Agent chat already supports third-party execution via `createMode: "dify" | "coze"`: Nest providers translate remote SSE into AI SDK UI Message Streams while BuildingAI owns conversation persistence. OpenCode runs as a headless HTTP server (`opencode serve`) with session APIs and an SSE event bus. The fixed business workspace on this host is `/home/opencode/opencode`. UI already has unused `WebPreview` (iframe) and `GenericTool` for tool steps.

## Goals / Non-Goals

**Goals:**

- Add `createMode: "opencode"` Agent path mirroring Dify/Coze provider shape
- Map BuildingAI `conversationId` 1:1 to OpenCode `sessionId`; persist full chat (text + tool steps + artifact metadata)
- Stream OpenCode file/terminal tool activity into the Agent workbench dialog
- L2 artifact isolation under `artifacts/<conversationId>/` inside the fixed workspace
- Serve HTML artifacts via authenticated API + iframe preview in chat

**Non-Goals:**

- Platform `/chat` OpenCode routing
- Git worktree (L3) isolation
- Billing/token alignment with OpenCode
- Interactive permission prompts in UI (MVP: server-side auto-allow policy)
- Inline sanitized HTML for full report pages (use iframe only)

## Decisions

### 1. Integration shape = Agent Provider (like Dify)

- **Choice:** `OpencodeChatProvider` branched from `AgentChatCompletionService` when `createMode === "opencode"`; keep `POST /api/ai-agents/:id/chat/stream` contract so client transport stays unchanged.
- **Alternatives:** Client→OpenCode direct (loses auth/history/billing); per-request `opencode run` CLI (weak streaming/session continuity).
- **Rationale:** Matches existing third-party pattern; minimal frontend churn.

### 2. Session mapping stored on conversation metadata

- **Choice:** Store `opencodeSessionId` (and optional `artifactRoot`) on the Agent conversation record metadata / JSON column already used for third-party ids (same idea as Dify conversation id remapping). BuildingAI conversation UUID remains the public id.
- **Alternatives:** Separate mapping table (heavier); OpenCode session id as route id (breaks BuildingAI history APIs).
- **Flow:** New chat → create OpenCode session → persist mapping; resume → reuse session; abort → call OpenCode abort.

### 3. Fixed workspace + L2 artifact dirs

- **Choice:** Agent config `thirdPartyIntegration.opencode.workspace` defaults to `/home/opencode/opencode`. Artifacts written to `{workspace}/artifacts/{conversationId}/` (template configurable). Shared source tree; isolated outputs per conversation.
- **Alternatives:** L3 worktree per conversation (deferred); per-user clone (ops heavy).
- **Guardrail:** Document in workspace `AGENTS.md` (or agent system hint) that report/dashboard HTML MUST be written under the conversation artifact directory; prefer `index.html` as entry.

### 4. Event translation → UI Message Stream

- **Choice:** Subscribe to OpenCode `/event` (or SDK equivalent) filtered by session; map to:
  - assistant text → `text-delta`
  - read/edit/write/bash (and similar) → `tool-*` parts with input/output for `GenericTool`
  - HTML artifact ready → custom `data-artifact` part `{ kind: "html", path, title, url }`
- **Persistence:** Save assistant message parts including tools + artifact so history replay works without OpenCode.
- **Truncation:** Cap bash/file payloads in stream/UI (e.g. last N KB) while keeping full path metadata.

### 5. HTML preview via auth proxy + WebPreview

- **Choice:** `GET /api/ai-agents/:agentId/conversations/:conversationId/artifacts/*path` serves files only from that conversation’s artifact root (path traversal safe). Client renders `data-artifact` with `WebPreview` iframe (`sandbox` allowing scripts for dashboards; no BuildingAI cookie leakage to arbitrary origins because same-origin proxy).
- **Alternatives:** `srcdoc` (size/CSP issues); expose OpenCode file API to browser (auth/path risk).
- **Entry resolution:** Prefer `index.html`; else first `*.html` written in the artifact dir during the turn.

### 6. OpenCode process topology

- **Choice:** Assume a long-running `opencode serve` on localhost (e.g. `:4096`) pointed at the fixed workspace. BuildingAI connects via HTTP/SDK (`@opencode-ai/sdk` or thin fetch client). Optional env `OPENCODE_BASE_URL` / agent config override.
- **Alternatives:** Nest spawns serve per request (slow); embed SDK server in Nest process (tighter coupling, harder lifecycle)—defer unless needed.
- **Auth:** Support `OPENCODE_SERVER_PASSWORD` basic auth if configured.

### 7. Permissions (MVP)

- **Choice:** Configure OpenCode permissions for automated allow on read/edit within workspace and constrained bash; no BuildingAI permission UI in MVP.
- **Follow-up:** Stream `data-permission` + UI confirm using OpenCode permission respond API.

### 8. Config surface

```json
{
  "opencode": {
    "baseUrl": "http://127.0.0.1:4096",
    "workspace": "/home/opencode/opencode",
    "artifactDirTemplate": "artifacts/{conversationId}",
    "basicAuthUser": "opencode",
    "basicAuthPassword": null
  }
}
```

## Risks / Trade-offs

- **[Risk] Concurrent sessions mutate shared source** → Mitigation: L2 isolates outputs; AGENTS.md steers writes to `artifacts/`; accept source-edit races until L3
- **[Risk] OpenCode event schema drift** → Mitigation: adapter layer + defensive parsing; spike against live `/doc` OpenAPI
- **[Risk] Large tool outputs flood UI/DB** → Mitigation: truncate in provider; collapse completed tools (existing UI)
- **[Risk] iframe XSS via artifact HTML** → Mitigation: sandbox; only serve under conversation artifact root; authz on proxy
- **[Risk] OpenCode serve down** → Mitigation: clear Agent error in stream; health check on agent config save (optional)
- **[Trade-off] Auto-allow permissions** → Faster MVP; weaker human-in-the-loop than TUI

## Migration Plan

1. Deploy API + client with new createMode (backward compatible; existing agents unchanged)
2. Ensure `opencode serve` running against `/home/opencode/opencode`; create `artifacts/` (gitignored if needed)
3. Create/configure an OpenCode-mode Agent in console
4. Rollback: remove/disable opencode agents; no schema-breaking migration if metadata is JSON

## Open Questions

- Exact OpenCode SSE event type names for tool start/end (confirm against running server `/doc`)
- Whether conversation metadata column already exists for arbitrary JSON (confirm entity fields during implement)
- Default port and whether BuildingAI should auto-start serve in dev scripts (prefer documented manual/systemd for MVP)
