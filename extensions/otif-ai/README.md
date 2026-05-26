# 供应链 OTIF 自治系统 (`otif-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-OTIF-AI.md`, DB: `docs/DB-OTIF-AI.md`.

## Entry

- `/apps/otif-ai`
- `/extension/otif-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **供应链 OTIF 自治助手**
3. `pnpm --filter otif-ai build:api` then `pnpm --filter otif-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/otif-check-rules-catalog.ts`.

## MCP

`otif_start_full_check`, `otif_get_check_progress`, `otif_cancel_check`, `otif_ingest_rule_result`, `otif_sql_query`, `otif_sql_execute`
