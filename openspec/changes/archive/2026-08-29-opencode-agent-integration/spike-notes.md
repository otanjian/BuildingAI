# OpenCode spike notes (this host)

- Workspace: `/home/opencode/opencode`
- Serve: `bun run --cwd packages/opencode --conditions=browser src/index.ts serve --port 4096 --hostname 127.0.0.1`
- Health: `GET /global/health` → `{ healthy: true, version: "local" }`
- Directory header: `x-opencode-directory` = URL-encoded absolute path (without header, session may bind to `packages/opencode` cwd)
- Session: `POST /session` → `{ id: "ses_..." }`
- Prompt: `POST /session/:id/prompt_async` body `{ parts: [{ type: "text", text }] }` → 204
- Events: `GET /event` SSE; key types:
  - `message.part.delta` (text field deltas)
  - `message.part.updated` with `Part` (`text` | `tool` | …)
  - `tool` part states: `pending` | `running` | `completed` | `error`
  - `session.idle` ends a turn
  - `file.edited` for file paths
- Default BuildingAI env: `OPENCODE_BASE_URL=http://127.0.0.1:4096`
- Artifacts root: `{workspace}/artifacts/{conversationId}/`
