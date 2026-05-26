# 应收账款风控自治系统 (`ar-risk-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-AR-RISK-AI.md`, DB: `docs/DB-AR-RISK-AI.md`.

## Entry

- `/apps/ar-risk-ai`
- `/extension/ar-risk-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **应收账款风控自治助手**
3. `pnpm --filter ar-risk-ai build:api` then `pnpm --filter ar-risk-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/ar-risk-check-rules-catalog.ts`.

## MCP

`ar_risk_start_full_check`, `ar_risk_get_check_progress`, `ar_risk_cancel_check`, `ar_risk_ingest_rule_result`, `ar_risk_sql_query`, `ar_risk_sql_execute`
