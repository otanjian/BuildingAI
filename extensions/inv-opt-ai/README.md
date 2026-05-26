# 库存优化自治系统 (`inv-opt-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-INV-OPT-AI.md`, DB: `docs/DB-INV-OPT-AI.md`.

## Entry

- `/apps/inv-opt-ai`
- `/extension/inv-opt-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **库存优化自治助手**
3. `pnpm --filter inv-opt-ai build:api` then `pnpm --filter inv-opt-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/inv-opt-check-rules-catalog.ts`.

## MCP

`inv_opt_start_full_check`, `inv_opt_get_check_progress`, `inv_opt_cancel_check`, `inv_opt_ingest_rule_result`, `inv_opt_sql_query`, `inv_opt_sql_execute`
