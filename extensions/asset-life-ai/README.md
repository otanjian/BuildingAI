# 固定资产全生命周期自治系统 (`asset-life-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-ASSET-LIFE-AI.md`, DB: `docs/DB-ASSET-LIFE-AI.md`.

## Entry

- `/apps/asset-life-ai`
- `/extension/asset-life-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **固定资产全生命周期自治助手**
3. `pnpm --filter asset-life-ai build:api` then `pnpm --filter asset-life-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/asset-life-check-rules-catalog.ts`.

## MCP

`asset_life_start_full_check`, `asset_life_get_check_progress`, `asset_life_cancel_check`, `asset_life_ingest_rule_result`, `asset_life_sql_query`, `asset_life_sql_execute`
