## Implementation sync (2026-05-24, post-archive)

The following differs from this design doc’s original targets; **`docs/PRD-EHCS-AI.md` V1.1.1** and `openspec/specs/ehcs-ai-*` are authoritative:

| Topic | Original design | Shipped |
|-------|-----------------|--------|
| Entry | `/extension/ehcs-ai` only | Also `/apps/ehcs-ai` iframe; platform FAB disabled on ehcs routes |
| Layout | Sidebar + 70/30 dashboard chat | Top nav; full-width dashboard; FAB → right agent dock |
| Chat API | `/api/ai-chat` + `modelId`/`mcpServerIds` in settings | `/api/ai-agents/{id}/chat/stream`; settings store `agent_id` only |
| Batch trigger | Dashboard「AI 自动检查」 | Agent dock「开始检查」; app loads rules then loops |
| Agent | Ad-hoc config | Seeded「EHCS数据健康自治」+ `ehcs-platform-agent.config.ts` |

---

## Context

EHCS-AI V1.1 is specified in `docs/PRD-EHCS-AI.md` with UI reference `docs/UI-EHCS-AI.html` (prototype; layout superseded by V1.1.1). BuildingAI loads application extensions from `extensions/<identifier>/` with isolated PostgreSQL schemas (`ehcs_ai` for identifier `ehcs-ai`). The platform exposes streaming LLM chat at `POST /api/ai-chat` with optional `mcpServerIds`; MCP execution stays inside the platform agent layer.

**Constraints from product:**

- Entry URL: **`/extension/ehcs-ai`** only (no `/apps/ehcs-ai` dependency).
- Do **not** copy `extensions/erp-healthy` patterns (postMessage to parent, inspection coordinator polling, parent-side chat panel).
- Full stack: extension console API + web UI; real AI streaming; MCP configured but not implemented in extension code.

## Goals / Non-Goals

**Goals:**

- Deliver PRD V1.1 pages: dashboard (`/dashboard`), rules (`/rules`), anomalies (`/anomalies`), plus settings.
- Persist rules and anomalies per PRD §4; orchestrate batch checks via `check_runs` + per-rule items.
- Stream AI in-extension for batch check progress and root-cause modal.
- Parse agent output into PRD §5.1 JSON on ingest; compute health score per PRD formula.
- Match `docs/UI-EHCS-AI.html` layout and interaction (sidebar, 70/30 dashboard, modals).

**Non-Goals:**

- Changes to `packages/client` or embedded app shell chat.
- Extension-side MCP SDK or ERP connectors.
- Scheduled runs, approval workflows, `/apps/*` registration (future).

## Decisions

### D1: New extension `ehcs-ai` from `extension-starter`

**Choice:** Scaffold `extensions/ehcs-ai` from `templates/extension-starter`.

**Alternatives rejected:**

- Extend `erp-healthy` — violates independence requirement; different schema and UX.
- Standalone SPA outside BuildingAI — loses auth, AI, and extension hosting.

### D2: Entry at `/extension/ehcs-ai`

**Choice:** `defineRouteOption({ base: 'extension/ehcs-ai', identifier: 'ehcs-ai' })`; default index → dashboard. Document access as `http://<host>/extension/ehcs-ai` (dev: client port 4091 with Vite proxy).

**Alternatives rejected:**

- `/apps/ehcs-ai` + parent `AppEmbeddedChatProvider` — couples to main client and erp-healthy-style integration.

### D3: In-extension chat via platform `/api/ai-chat`

**Choice:** `src/web/lib/platform-chat.ts` wraps `@ai-sdk/react` + `DefaultChatTransport` pointing to `${origin}/api/ai-chat`, auth from `@buildingai/stores`. Pass `modelId` and `mcpServerIds` from `app_settings` on each request.

**Alternatives rejected:**

- postMessage + parent sidebar — erp-healthy pattern.
- Backend proxies full stream through extension API — duplicates platform logic; only **ingest** hits extension API after stream completes.

### D4: Batch check — one `check_run`, one conversation per rule

**Choice:**

1. `POST /ehcs-ai/console/check-runs` → `check_run` + `check_run_items` (pending).
2. For each enabled rule: new platform conversation (or `conversationId: 'new'` per call), stream check prompt, on finish `POST .../items/:ruleId/ingest` with `assistantText`.
3. Backend parses JSON → `check_results`; updates item status; when all items terminal → run `completed`.

**Alternatives rejected:**

- Single conversation for all rules — context pollution and harder failure isolation.
- Frontend-only memory (HTML prototype) — violates full-stack requirement.

### D5: Check prompt and ingest contract

**Choice:** Prompt template (English in code, Chinese in user-visible copy) requires trailing JSON matching PRD §5.1:

```json
{ "ruleId": "...", "anomalies": [ { "anomalyId", "description", "riskLevel", "rootCauseAnalysis", "solution", "status", "autoFixed" } ] }
```

Ingest: extract JSON (fenced or raw), validate with Zod, map to `check_results`; empty `anomalies` = pass; parse error = item `failed`, no fake rows (PRD §6.2).

### D6: Data model

**Schema:** `ehcs_ai`

| Table | Purpose |
|-------|---------|
| `check_rules` | PRD §4.1 |
| `check_results` | PRD §4.2 |
| `check_runs` | One batch inspection |
| `check_run_items` | Per-rule status, `conversation_id`, error |
| `app_settings` | Singleton row: `model_id`, `mcp_server_ids` (jsonb) |
| `rca_sessions` | Optional: `anomaly_id`, `conversation_id` |

Enums stored as varchar or PG enum matching PRD Chinese labels: 高/中/低, 待解决/已解决/ai自动修复.

### D7: Root cause analysis

**Choice:** `RcaModal` uses separate `useChat` instance; `POST /anomalies/:id/rca/sessions` returns optional stored `conversationId`. V1.1: **new session each open** (PRD). Stream steps are model-generated, not `setTimeout` fake steps.

### D8: Dashboard metrics

**Choice:** `GET /dashboard/summary` computes server-side:

- `healthScore = max(0, 100 - (high*10 + mid*5 + low*2))` for `status = 待解决`
- `autoFixRate = count(auto_fixed) / count(all results)`
- Trend: `GROUP BY date(check_time)` last 7 days

### D9: HTTP clients

**Choice:** `createPluginHttpClients('ehcs-ai')` for `/ehcs-ai/console/*`. Platform chat uses separate client with `pathPrefix: '/api'` (no extension prefix).

### D10: UI stack

**Choice:** React + Tailwind (extension `globals.css`) aligned with `UI-EHCS-AI.html` tokens; reuse `@buildingai/ui` primitives where helpful (Button, Dialog). No copy-paste of 1092-line HTML as single file — componentize.

## Architecture diagram

```
/extension/ehcs-ai/dashboard
┌─────────────────────────────────────────────────────────┐
│ EhcsLayout (sidebar nav)                                 │
│ ┌──────────────────────────┬──────────────────────────┐│
│ │ DashboardLeft              │ ChatPanel                ││
│ │ - stats API                │ - usePlatformChat        ││
│ │ - trend API                │ - onCheck: run loop      ││
│ │ - recent anomalies API     │ - POST ingest per rule   ││
│ └──────────────────────────┴──────────────────────────┘│
└─────────────────────────────────────────────────────────┘
         │ consoleHttpClient              │ fetch /api/ai-chat
         ▼                                ▼
   ehcs-ai API modules              BuildingAI platform AI + MCP
```

## API surface (console)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard/summary` | Cards |
| GET | `/dashboard/trend?days=7` | Bar chart |
| GET | `/dashboard/recent-anomalies?limit=5` | Table |
| CRUD | `/rules` | + `PATCH /rules/:id/toggle` |
| GET | `/anomalies` | Query: risk, status |
| POST | `/check-runs` | Start batch |
| GET | `/check-runs/:id` | Progress |
| POST | `/check-runs/:id/items/:ruleId/ingest` | Body: assistantText, conversationId |
| POST | `/check-runs/:id/cancel` | Optional abort |
| POST | `/anomalies/:id/rca/sessions` | RCA session |
| GET/PUT | `/settings` | modelId, mcpServerIds |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Model returns non-JSON | Strict prompt + ingest retry message in chat; mark item failed |
| Long batch exceeds PRD 2 min for 10 rules | Parallel disabled in V1.1; show progress; allow cancel |
| MCP misconfigured | Settings page validation; block check with clear toast |
| Token limits on large ERP pulls | Agent/MCP concern; prompt asks for summarized findings |
| Extension-only URL unknown to users | README + console menu entry under extension |

## Migration Plan

1. Add `extensions/ehcs-ai`, build API + web.
2. Register in `extensions.json` (`applications.ehcs-ai.enabled: true`).
3. Run migrations for schema `ehcs_ai`.
4. Seed PRD appendix rules/anomalies.
5. Verify at `/extension/ehcs-ai/dashboard` with platform model + MCP configured in admin.

**Rollback:** Disable extension in `extensions.json`; schema can remain.

## Open Questions

- Whether to add a minimal web menu link from BuildingAI home to `/extension/ehcs-ai` (out of scope unless product asks).
- Platform API for listing MCP servers from extension iframe — confirm existing web endpoint path during P0 spike.
