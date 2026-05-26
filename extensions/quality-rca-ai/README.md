# 质量异常追溯自治系统 (`quality-rca-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-QUALITY-RCA-AI.md`, DB: `docs/DB-QUALITY-RCA-AI.md`.

## Entry

- `/apps/quality-rca-ai`
- `/extension/quality-rca-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **质量异常追溯自治助手**
3. `pnpm --filter quality-rca-ai build:api` then `pnpm --filter quality-rca-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/quality-rca-check-rules-catalog.ts`.

## MCP

`quality_rca_start_full_check`, `quality_rca_get_check_progress`, `quality_rca_cancel_check`, `quality_rca_ingest_rule_result`, `quality_rca_sql_query`, `quality_rca_sql_execute`
