# 人力资源合规自治系统 (`hr-compliance-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-HR-COMPLIANCE-AI.md`, DB: `docs/DB-HR-COMPLIANCE-AI.md`.

## Entry

- `/apps/hr-compliance-ai`
- `/extension/hr-compliance-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **人力资源合规自治助手**
3. `pnpm --filter hr-compliance-ai build:api` then `pnpm --filter hr-compliance-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/hr-compliance-check-rules-catalog.ts`.

## MCP

`hr_compliance_start_full_check`, `hr_compliance_get_check_progress`, `hr_compliance_cancel_check`, `hr_compliance_ingest_rule_result`, `hr_compliance_sql_query`, `hr_compliance_sql_execute`
