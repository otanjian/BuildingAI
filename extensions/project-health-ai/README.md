# 项目交付健康自治系统 (`project-health-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-PROJECT-HEALTH-AI.md`, DB: `docs/DB-PROJECT-HEALTH-AI.md`.

## Entry

- `/apps/project-health-ai`
- `/extension/project-health-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **项目交付健康自治助手**
3. `pnpm --filter project-health-ai build:api` then `pnpm --filter project-health-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/project-health-check-rules-catalog.ts`.

## MCP

`project_health_start_full_check`, `project_health_get_check_progress`, `project_health_cancel_check`, `project_health_ingest_rule_result`, `project_health_sql_query`, `project_health_sql_execute`
