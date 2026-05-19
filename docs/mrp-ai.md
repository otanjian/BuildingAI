# MRP AI inspection (implementation map)

Product checklist mapped to **`governance_run`** extension schema (not separate `data_quality_check_*` tables).

| Requirement | Implementation |
|-------------|----------------|
| 开始检查 | `POST /inspection/sessions` + `openStandardInspectionChat` |
| 会话主题 `数据检测` + 到秒 | `governance_run.sessionTitle` + `PATCH /api/ai-conversations/:id` |
| Prompt 输出格式 | `build-inspection-prompt.ts` JSON schema block |
| 结果落库 | `governance_rule_result` + `governance_check_detail` |
| 双击上次结果 | `RuleResultDetailDrawer` + `GET /inspection/rule-results/:id/details` |

## Tables (PostgreSQL `mrp_governance` schema)

**Task** → `governance_run` (`runType = ai_inspection`, `status = checking|completed`)

| PRD field | Column |
|-----------|--------|
| task_id | `id` (uuid) |
| check_time | `startedAt` / `finishedAt` |
| executor | `executor` |
| data_source | `dataSource` |
| status | `status` |

**Rule result** → `governance_rule_result`

| PRD field | Column |
|-----------|--------|
| task_id | `runId` |
| module | `module` |
| rule_name / description | `ruleName`, `ruleDescription` |
| total_records, failed_records, pass_rate | `totalRecords`, `failedRecords`, `passRate` |
| summary, conclusion, suggestion | `summary`, `conclusion`, `suggestion` |

**Detail** → `governance_check_detail`

| PRD field | Column |
|-----------|--------|
| rule_result_id | `ruleResultId` |
| doc_type, doc_code, doc_name | `docType`, `docCode`, `docName` |
| field_name, current_value, expected_value | `fieldName`, `currentValue`, `expectedValue` |
| additional_info | `additionalInfo` (jsonb) |

## Constraints

- Path A only (platform AI + MCP); no primary use of `POST /ai-check/rule` for dashboard flow.
- Zero `packages/client` changes; coordinator uses platform Web API from extension iframe.
- One **开始检查** runs all enabled rules.
