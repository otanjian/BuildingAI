# 税务合规自治系统 (`tax-compliance-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-TAX-COMPLIANCE-AI.md`, DB: `docs/DB-TAX-COMPLIANCE-AI.md`.

## Entry

- `/apps/tax-compliance-ai`
- `/extension/tax-compliance-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **税务合规自治助手**
3. `pnpm --filter tax-compliance-ai build:api` then `pnpm --filter tax-compliance-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/tax-compliance-check-rules-catalog.ts`.

## MCP

`tax_compliance_start_full_check`, `tax_compliance_get_check_progress`, `tax_compliance_cancel_check`, `tax_compliance_ingest_rule_result`, `tax_compliance_sql_query`, `tax_compliance_sql_execute`
