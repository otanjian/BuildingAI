# ESG 合规披露自治系统 (`esg-report-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-ESG-REPORT-AI.md`, DB: `docs/DB-ESG-REPORT-AI.md`.

## Entry

- `/apps/esg-report-ai`
- `/extension/esg-report-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **ESG 合规披露自治助手**
3. `pnpm --filter esg-report-ai build:api` then `pnpm --filter esg-report-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/esg-report-check-rules-catalog.ts`.

## MCP

`esg_report_start_full_check`, `esg_report_get_check_progress`, `esg_report_cancel_check`, `esg_report_ingest_rule_result`, `esg_report_sql_query`, `esg_report_sql_execute`
