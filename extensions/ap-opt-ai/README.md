# 应付账款优化自治系统 (`ap-opt-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-AP-OPT-AI.md`, DB: `docs/DB-AP-OPT-AI.md`.

## Entry

- `/apps/ap-opt-ai`
- `/extension/ap-opt-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **应付账款优化自治助手**
3. `pnpm --filter ap-opt-ai build:api` then `pnpm --filter ap-opt-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/ap-opt-check-rules-catalog.ts`.

## MCP

`ap_opt_start_full_check`, `ap_opt_get_check_progress`, `ap_opt_cancel_check`, `ap_opt_ingest_rule_result`, `ap_opt_sql_query`, `ap_opt_sql_execute`
