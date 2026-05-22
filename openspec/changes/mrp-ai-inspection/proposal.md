## Why

MRP data governance already opens the platform AI sidebar and runs per-rule MCP inspections, but results live only in browser `localStorage` and are disconnected from dashboard scores, run history, and rule tables. Operators cannot reliably audit past checks or open structured exception lists from the dashboard. We need a durable inspection loop aligned with `docs/mrp-ai.md` without modifying the main platform client.

## Why now

The dashboard UI and MCP path (Path A) are in place; the missing piece is persistence, session naming, structured AI output, and detail drill-down. Batch rule-engine runs (`governance_run` + `quality_issue`) already exist—AI inspections should reuse that model instead of parallel tables.

## What Changes

- Extend `governance_run` with `ai_inspection` run type, session title (`数据检测 YYYY-MM-DD HH:mm:ss`), executor, data source, and optional platform `conversationId`.
- Add `governance_rule_result` and `governance_check_detail` entities (mapped from `docs/mrp-ai.md` semantics) linked to a run.
- New extension APIs: start inspection session, persist per-rule results, complete session (recompute score), list rule results for dashboard.
- Enhance per-rule inspection prompts with `ruleCode`, run metadata, and a required trailing JSON block for parsing.
- Extension-side **Inspection Coordinator**: after `postMessage` opens chat, poll platform `ai-conversations` APIs (no `packages/client` changes), parse completed assistant messages, persist to DB, PATCH conversation title.
- Dashboard: read last results from DB; double-click **上次结果** opens a detail drawer with paginated exceptions.
- Deprecate primary reliance on `ai-check-storage` (localStorage) and the embedded `use-ai-check-queue` flow for the main **开始检查** button.

## Non-goals

- Changing `packages/client` (`use-assistant`, `AppEmbeddedChatProvider`, sidebar title).
- Replacing Path A with server-side `AiCheckService.generateObject` for the main flow.
- Single-rule-only inspection from the table row (still runs all enabled rules on **开始检查**).
- Auto-remediation or approval flows in this change (detail UI only; proposals unchanged).

## Capabilities

### New Capabilities

- `mrp-ai-inspection-session`: Start/complete AI inspection runs on `governance_run`, bind conversation, compute score.
- `mrp-ai-inspection-persist`: Parse structured AI output; store rule results and check details.
- `mrp-ai-inspection-coordinator`: Extension web coordinator (prompt contract, polling, platform conversation title update).
- `mrp-ai-inspection-dashboard`: Dashboard rule overview from DB, detail drawer on last result.

### Modified Capabilities

<!-- No existing openspec/specs for erp-healthy; requirements live in docs/mrp.md and docs/mrp-ai.md -->

## Impact

- **Extension**: `extensions/erp-healthy` (API entities, migrations, inspection module, web dashboard, prompt builder, coordinator hook).
- **Docs**: `docs/mrp-ai.md` remains the product checklist; implementation maps to extended `governance_run` model.
- **Platform**: Read-only use of existing Web APIs (`GET/PATCH /ai-conversations`); no client package changes.
- **Database**: New tables/columns under `erp_healthy` schema via TypeORM entities + migration.
