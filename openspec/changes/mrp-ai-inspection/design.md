## Context

The `erp-healthy` extension dashboard triggers AI inspections via `postMessage` (`extension-open-chat`) to the platform embedded chat sidebar. The agent uses ERP MCP tools (Path A). Results today are cached in `localStorage` (`ai-check-storage.ts`) and merged into the rules table; dashboard scores still come from batch `governance_run` + `quality_issue` (rule engine). Product requirements in `docs/mrp-ai.md` require session titles, structured output, DB persistence, and detail drill-down.

**Constraints (locked):**

- Path A only (no `AiCheckService.generateObject` as primary flow).
- Extend existing `governance_run`; do not add parallel `data_quality_check_*` tables.
- Zero changes to `packages/client`—integration via existing `postMessage` to open chat only.
- **开始检查** always runs all enabled rules sequentially (existing `promptQueue`).

## Goals / Non-Goals

**Goals:**

- One AI inspection = one `governance_run` with `runType = ai_inspection`.
- Per-rule `governance_rule_result` + `governance_check_detail` rows after each assistant reply completes.
- Session title `数据检测 YYYY-MM-DD HH:mm:ss` stored on run and applied to platform conversation via Web API.
- Structured JSON at end of each assistant message for reliable parsing.
- Dashboard reads last results from DB; double-click opens detail drawer.
- Recompute health score on inspection complete (reuse `DashboardService.computeScore`).

**Non-Goals:**

- Platform sidebar title (stays "AI 检查"); conversation list title is updated via API.
- Single-rule inspection from table row.
- Remediation proposals / MCP write-back in this change.

## Decisions

### D1: Data model extends `governance_run`

Add columns on `governance_run`:

| Column | Type | Purpose |
|--------|------|---------|
| `runType` | enum `rule_engine` \| `ai_inspection` | Distinguish batch vs AI chat runs |
| `sessionTitle` | varchar | `数据检测 2026-05-19 14:32:07` |
| `executor` | varchar | `AI Agent` or user id |
| `dataSource` | varchar | default `ERP` |
| `conversationId` | uuid, nullable | Platform AI conversation |
| `inspectionMeta` | jsonb | modelId, mcpServerId, rule codes, progress |

New entities:

- `governance_rule_result` — one row per rule per run (maps `docs/mrp-ai.md` rule_result fields).
- `governance_check_detail` — exception rows linked to `rule_result_id`.

`quality_issue` unchanged for this change; optional future sync from details.

**Alternative rejected:** Separate `data_quality_check_*` tables—duplicates run lifecycle and dashboard queries.

### D2: Completion detection via extension polling (not platform events)

Platform does not emit per-rule completion to the iframe. The extension runs an **Inspection Coordinator** in the dashboard page:

1. `POST /inspection/sessions` → create `RUNNING` run + `sessionTitle`.
2. `postMessage` open chat with enhanced `promptQueue` (unchanged platform contract).
3. Poll `GET /api/web/ai-conversations` (via extension `apiHttpClient`) to find conversation: `updatedAt >= startedAt - 10s` and first user message contains `runId=` metadata or `请检查：` prefix.
4. `PATCH` run with `conversationId`; `PATCH` conversation `title = sessionTitle`.
5. Poll `GET /api/web/ai-conversations/:id` for messages; when assistant message `k` has `status === completed` and `persistedCount < k`, parse JSON and `POST` rule result.
6. When `persistedCount === enabledRules.length`, `POST /inspection/sessions/:id/complete`.

Poll interval: 2s active, 5s idle; pause on `document.hidden`.

**Alternative rejected:** Modify `use-assistant` to callback—violates zero platform change.

### D3: Prompt contract and parsing

Extend `build-inspection-prompt.ts` per rule:

- Human-readable check lines (existing).
- Metadata line: `ruleCode`, `runId`, `seq/total`.
- Required trailing JSON schema block (`details[]`, counts, `conclusion`, `suggestion`).

Parser: extract last ` ```json ` fence from assistant text → Zod validate → map to entities. On failure: `status = failed`, store `rawAssistantText`, `conclusion = 检查失败`.

Queue order: assistant message index `k` maps to enabled rule index `k` (same as `promptQueue`).

### D4: Dashboard data source

`DashboardService.getRulesOverview()` reads latest **completed** `ai_inspection` run's `governance_rule_result` for `lastCheckAt`, `lastResult`, `issueCount`. Fallback text `尚未检查` if none.

Remove primary merge from `localStorage` (may keep brief optimistic UI until refresh).

### D5: Detail UI

Double-click (or click) **上次结果** cell → Drawer/Dialog → `GET /inspection/rule-results/:id/details` paginated table.

### D6: API surface (extension console routes)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/inspection/sessions` | Start run; body: `{ ruleCodes[] }` from enabled catalog |
| PATCH | `/inspection/sessions/:runId` | Bind `conversationId` |
| POST | `/inspection/sessions/:runId/rule-results` | Upsert one rule result + details |
| POST | `/inspection/sessions/:runId/complete` | Finalize run, score, counts |
| GET | `/inspection/rule-results/:id/details` | Paginated details for drawer |

Auth: same extension console guards as existing dashboard routes.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Conversation not found (multiple chats) | Embed `runId` in prompt metadata; match by time + first user message fingerprint |
| Model omits JSON block | Mark rule failed; show raw text in drawer; optional retry later |
| Poll lag 2–5s before DB update | Acceptable; show "检查中" on table while run `RUNNING` |
| Sidebar title still "AI 检查" | Document; list title updated via PATCH |
| `apiHttpClient` auth/CORS from iframe | Verify `createPluginHttpClients` web base URL in embedded `/apps` context |
| Long MCP tool runs | Only persist when message `status === completed`, not by message count alone |

## Migration Plan

1. Add TypeORM entities + migration under `erp_healthy` schema.
2. Deploy API; existing batch runs default `runType = rule_engine`.
3. Deploy web coordinator + dashboard changes.
4. Optional: clear stale `erp-healthy:ai-check-results` localStorage key on first load.

Rollback: revert extension; new tables/columns remain unused; batch governance unaffected.

## Open Questions

- Whether to expose `GET /inspection/sessions/:id` for run history page linking (can defer).
- Max `details` rows per rule (suggest cap 500 insert per POST with truncation flag in `inspectionMeta`).
