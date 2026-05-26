# 主数据质量自治系统 (`mdm-quality-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-MDM-QUALITY-AI.md`, DB: `docs/DB-MDM-QUALITY-AI.md`.

## Entry

- `/apps/mdm-quality-ai`
- `/extension/mdm-quality-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **主数据质量自治助手**
3. `pnpm --filter mdm-quality-ai build:api` then `pnpm --filter mdm-quality-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/mdm-quality-check-rules-catalog.ts`.

## MCP

`mdm_quality_start_full_check`, `mdm_quality_get_check_progress`, `mdm_quality_cancel_check`, `mdm_quality_ingest_rule_result`, `mdm_quality_sql_query`, `mdm_quality_sql_execute`
