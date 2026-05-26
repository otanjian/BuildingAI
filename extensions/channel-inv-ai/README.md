# 渠道库存协同自治系统 (`channel-inv-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-CHANNEL-INV-AI.md`, DB: `docs/DB-CHANNEL-INV-AI.md`.

## Entry

- `/apps/channel-inv-ai`
- `/extension/channel-inv-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **渠道库存协同自治助手**
3. `pnpm --filter channel-inv-ai build:api` then `pnpm --filter channel-inv-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/channel-inv-check-rules-catalog.ts`.

## MCP

`channel_inv_start_full_check`, `channel_inv_get_check_progress`, `channel_inv_cancel_check`, `channel_inv_ingest_rule_result`, `channel_inv_sql_query`, `channel_inv_sql_execute`
