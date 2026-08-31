## Why

当前 HTTP 日志、分析数据和用户积分流水彼此分散，无法完整回答一次模型调用或工具动作的操作者、租户、Agent 版本、策略决定、结果和真实成本。企业上线需要不可变审计、全链路可观测、租户/项目预算和可对账的成本账本。

## What Changes

- 建立统一 append-only 审计事件，覆盖认证、资源变更、模型、检索、工具、审批、发布和数据操作。
- 贯穿 requestId/correlationId、tenant/project、actor、Agent 版本、tool、policy、approval 和结果摘要。
- 引入结构化日志、Trace、Metrics、SIEM/WORM 导出、敏感字段脱敏和分级保留。
- 建立租户→部门→项目→Agent→用户的预算、配额、并发和限流策略。
- 增加 usage event、成本预留/结算/冲正、价格版本、幂等键和月度对账。
- 提供异常成本、队列、延迟、失败、拒绝和审计完整性告警及运维 Runbook。
- 提供租户管理员和审计员可在浏览器中查询脱敏审计、用量、预算、告警、对账和保留状态；原始秘密与受限 payload 不可通过 UI 导出。

## Capabilities

### New Capabilities

- `audit-observability-and-cost-governance`: 提供企业级审计、可观测性、预算、配额和成本归因。

### Modified Capabilities

<!-- None. Existing billing and logging are extended behind compatible interfaces. -->

## Impact

- 影响 `packages/api` logger/interceptors、Agent runtime、MCP/tool、automation、billing、health、queue 和 console 查询。
- 影响 `AccountLog`、Analyse/usage 及现有本地文件日志的职责边界；需要新增 audit/usage/budget/price 表和外部观测 sink。
- 需要部署 OpenTelemetry/metrics/log/SIEM 组件和告警、保留、对账任务。
- 浏览器验收必须覆盖审计检索、预算超限、重复请求幂等、成本明细和权限隔离；不能只验证数据库流水。

## Non-Goals

- 不在本 change 内选择最终 SIEM 厂商或建立全量数据湖。
- 不替代租户授权、凭据保护和 Agent 发布流程，只记录并消费其上下文。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization` 的租户/项目上下文，并消费凭据、Tool Gateway、Agent 版本和 RAG 事件。
- 为 `enterprise-iam-and-data-governance` 提供可保留/导出的审计与 usage 事件，但不决定最终法律保留期。
