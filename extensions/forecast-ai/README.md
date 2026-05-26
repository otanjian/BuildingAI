# 销售预测校准自治系统 (`forecast-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-FORECAST-AI.md`, DB: `docs/DB-FORECAST-AI.md`.

## Entry

- `/apps/forecast-ai`
- `/extension/forecast-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **销售预测校准自治助手**
3. `pnpm --filter forecast-ai build:api` then `pnpm --filter forecast-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/forecast-check-rules-catalog.ts`.

## MCP

`forecast_start_full_check`, `forecast_get_check_progress`, `forecast_cancel_check`, `forecast_ingest_rule_result`, `forecast_sql_query`, `forecast_sql_execute`
