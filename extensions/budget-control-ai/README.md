# 预算执行监控自治系统 (`budget-control-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-BUDGET-CONTROL-AI.md`, DB: `docs/DB-BUDGET-CONTROL-AI.md`.

## Entry

- `/apps/budget-control-ai`
- `/extension/budget-control-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **预算执行监控自治助手**
3. `pnpm --filter budget-control-ai build:api` then `pnpm --filter budget-control-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/budget-control-check-rules-catalog.ts`.

## MCP

`budget_control_start_full_check`, `budget_control_get_check_progress`, `budget_control_cancel_check`, `budget_control_ingest_rule_result`, `budget_control_sql_query`, `budget_control_sql_execute`
