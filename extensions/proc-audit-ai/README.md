# 采购合规审查自治系统 (`proc-audit-ai`)

Scaffolded from `ehcs-ai`. PRD: `docs/PRD-PROC-AUDIT-AI.md`, DB: `docs/DB-PROC-AUDIT-AI.md`.

## Entry

- `/apps/proc-audit-ai`
- `/extension/proc-audit-ai`

## Setup

1. Enable in `extensions/extensions.json` → `pnpm extension:sync`
2. Settings → **采购合规审查自治助手**
3. `pnpm --filter proc-audit-ai build:api` then `pnpm --filter proc-audit-ai seed:rules`

Rules catalog: **30+** entries in `src/api/db/seed-data/proc-audit-check-rules-catalog.ts`.

## MCP

`proc_audit_start_full_check`, `proc_audit_get_check_progress`, `proc_audit_cancel_check`, `proc_audit_ingest_rule_result`, `proc_audit_sql_query`, `proc_audit_sql_execute`
