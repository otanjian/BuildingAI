# 合同履约自治系统 (`contract-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-CONTRACT-AI.md`, DB: `docs/DB-CONTRACT-AI.md`.

## Entry

- `/apps/contract-ai`
- `/extension/contract-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **合同履约自治助手**
3. `pnpm --filter contract-ai build:api` then `pnpm --filter contract-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/contract-check-rules-catalog.ts`.

## MCP

`contract_start_full_check`, `contract_get_check_progress`, `contract_cancel_check`, `contract_ingest_rule_result`, `contract_sql_query`, `contract_sql_execute`
