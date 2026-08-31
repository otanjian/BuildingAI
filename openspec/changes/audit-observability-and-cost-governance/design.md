## Context

现有 `HttpLoggerInterceptor` 主要记录 HTTP 元数据，本地日志按月清理；`AccountLog` 主要是用户积分账本，不能表达 Agent/tool/audit provenance。计费存在事务扣减基础，但缺少租户预算和统一 usage event。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 建立统一审计、观测、usage、预算和成本账本契约。
- 贯穿同步/异步链路并保护敏感数据。
- 支持硬限额、成本预留结算、对账和可执行告警。

**Non-Goals:**

- 不在本 change 内完成所有历史日志回填。
- 不将指标标签填入原始提示词、工具参数或凭据。

## Decisions

1. **Audit 与业务账本分离。** `audit_events` 关注谁做了什么和策略证据，`usage_events/cost_ledger` 关注可重算的资源与金额；二者通过 request/correlation/usage ID 关联。
2. **Outbox 保证业务与审计一致。** 关键事务写入 outbox，再异步发送 SIEM/Telemetry；高风险操作在审计无法落盘时 fail closed，普通指标允许降级。
3. **结构化日志白名单。** 日志只允许声明字段，统一 redactor 处理 headers、token、PII、prompt/tool payload；避免黑名单漏报。
4. **成本采用 reserve/settle/reverse。** 请求开始预留估算，结束按实际结算，失败/重复使用幂等键冲正；价格表单独版本化。
5. **层级预算继承。** 策略引擎从 tenant→department→project→agent→user 合并限额，最严格硬限额优先，避免子级覆盖企业上限。
6. **外部 sink 可替换。** OpenTelemetry、Prometheus、结构化日志和 SIEM 通过 adapter 输出，核心审计事件先在本地可靠持久化。

替代方案：只扩展现有 HTTP 日志无法覆盖异步/工具/审批；只增加余额扣减无法解释成本和预算归因，因此不采用。

## Risks / Trade-offs

- [Risk] 审计写入拖慢请求 → Mitigation：本地 outbox/批量 sink，关键事件同步确认，非关键 telemetry 异步。
- [Risk] 审计本身保存敏感内容 → Mitigation：payload digest/引用、字段分类和脱敏测试，默认不保存原文。
- [Risk] 供应商账单与实时估算不一致 → Mitigation：价格版本、reserve/settle/reverse 和月度对账差异队列。
- [Risk] 高基数 metrics 增加成本 → Mitigation：限制 tenant/agent/tool 标签集合，详细维度放 Trace/日志查询。

## Migration Plan

1. 统一 request/correlation context 和 redaction，先接入现有 HTTP、Agent、queue、tool、billing 路径。
2. 创建 audit/usage/budget/price/outbox 表，关键事务双写并做完整性对账。
3. 部署 Telemetry/SIEM sink、仪表盘和告警；按数据分类配置保留和法律保全。
4. 启用 tenant/project/agent/user 层预算预留和硬限额，保留现有积分扣减兼容层。
5. 对账稳定后逐步下线分散的敏感本地日志和非幂等扣费路径。
6. 若观测 sink 故障，保留本地 outbox；高风险操作按策略暂停，普通请求按降级规则运行。

## Open Questions

- 审计事件的默认保留期和不同地区的数据出口可由客户合同与合规评审确定，不改变事件字段与不可变语义。

## Browser Acceptance Design

- 目标控制台入口：`/console/audit`、`/console/usage`、`/console/budget` 或等价治理工作区。
- 种子数据：租户 A/B、A 的管理员/审计员/只读成员、带模型和工具 usage 的项目、接近软限额和已达到硬限额的项目、一个告警事件。
- 正向流程：管理员筛选时间/项目/Agent → 查看审计详情和 correlation ID → 查看 usage/cost/budget → 刷新验证一致性 → 打开告警/对账状态。
- 负向流程：只读用户和跨租户/跨项目筛选、敏感 payload 展开/导出、硬限额后重试，均显示安全 denial 或掩码结果。
- 证据：截图、分页/过滤条件、usage/cost 数值、quota denial、alert/audit IDs；不保存原始 prompt、token 或凭据。
- 浏览器验收使用可重置的测试预算/usage fixture，并实际刷新、翻页、筛选和下载脱敏报告；API/数据库检查只能作为辅助证据。
