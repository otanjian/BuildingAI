# 售后服务 SLA 自治系统 (`service-sla-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-SERVICE-SLA-AI.md`, DB: `docs/DB-SERVICE-SLA-AI.md`.

## Entry

- `/apps/service-sla-ai`
- `/extension/service-sla-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **售后服务 SLA 自治助手**
3. `pnpm --filter service-sla-ai build:api` then `pnpm --filter service-sla-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/service-sla-check-rules-catalog.ts`.

## MCP

`service_sla_start_full_check`, `service_sla_get_check_progress`, `service_sla_cancel_check`, `service_sla_ingest_rule_result`, `service_sla_sql_query`, `service_sla_sql_execute`
