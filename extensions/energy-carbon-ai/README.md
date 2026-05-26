# 能源与碳排放自治系统 (`energy-carbon-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-ENERGY-CARBON-AI.md`, DB: `docs/DB-ENERGY-CARBON-AI.md`.

## Entry

- `/apps/energy-carbon-ai`
- `/extension/energy-carbon-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **能源与碳排放自治助手**
3. `pnpm --filter energy-carbon-ai build:api` then `pnpm --filter energy-carbon-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/energy-carbon-check-rules-catalog.ts`.

## MCP

`energy_carbon_start_full_check`, `energy_carbon_get_check_progress`, `energy_carbon_cancel_check`, `energy_carbon_ingest_rule_result`, `energy_carbon_sql_query`, `energy_carbon_sql_execute`
