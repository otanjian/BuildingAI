# 生产成本偏差自治系统 (`mfg-var-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-MFG-VAR-AI.md`, DB: `docs/DB-MFG-VAR-AI.md`.

## Entry

- `/apps/mfg-var-ai`
- `/extension/mfg-var-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **生产成本偏差自治助手**
3. `pnpm --filter mfg-var-ai build:api` then `pnpm --filter mfg-var-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/mfg-var-check-rules-catalog.ts`.

## MCP

`mfg_var_start_full_check`, `mfg_var_get_check_progress`, `mfg_var_cancel_check`, `mfg_var_ingest_rule_result`, `mfg_var_sql_query`, `mfg_var_sql_execute`
