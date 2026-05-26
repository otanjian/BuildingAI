# 外汇风险自治系统 (`fx-risk-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-FX-RISK-AI.md`, DB: `docs/DB-FX-RISK-AI.md`.

## Entry

- `/apps/fx-risk-ai`
- `/extension/fx-risk-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **外汇风险自治助手**
3. `pnpm --filter fx-risk-ai build:api` then `pnpm --filter fx-risk-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/fx-risk-check-rules-catalog.ts`.

## MCP

`fx_risk_start_full_check`, `fx_risk_get_check_progress`, `fx_risk_cancel_check`, `fx_risk_ingest_rule_result`, `fx_risk_sql_query`, `fx_risk_sql_execute`
