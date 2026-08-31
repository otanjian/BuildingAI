## Why

平台已有提示词、标注和运行时能力，但没有统一的黄金数据集、红队集、回归评测、SLO、备份恢复和生产准入门禁。企业无法仅凭演示判断 Agent 在真实数据、工具失败、提示词注入、成本和版本升级后的稳定性。

## What Changes

- 建立租户/项目级评测数据集、用例、版本、运行和结果模型。
- 支持离线回归、线上抽样、红队、提示词注入、越权召回、PII 泄露和工具参数正确性评测。
- 定义质量、引用、工具成功率、拒答、延迟、成本和安全阈值，作为 Agent 发布门禁。
- 建立生产 readiness 检查：SLO、监控、告警、备份恢复、灾备、容量和安全测试证据。
- 将生产事故、人工反馈和线上失败样本回灌为回归用例。
- 提供版本对比、趋势、失败聚类、报告和阻断/豁免审批。
- 提供评测控制台，可创建脱敏数据集和红队用例、运行评测、查看逐例结果、审批豁免和查看 readiness checklist。

## Capabilities

### New Capabilities

- `ai-evaluation-and-production-readiness`: 提供 AI 质量评测、红队回归和企业生产准入门禁。

### Modified Capabilities

<!-- None. Agent release consumes this capability's gate results. -->

## Impact

- 影响 Agent 版本发布、模型路由、RAG、Tool Gateway、usage/cost、health、backup、CI/CD 和管理控制台。
- 需要新增评测数据集/用例/运行/结果/门禁表、离线 runner、报告 API、采样与脱敏管线。
- 需要与 `agent-version-release-and-approval`、`audit-observability-and-cost-governance` 联动。
- 浏览器验收必须验证评测运行、逐例失败、门禁阻断/通过、豁免到期和 readiness 缺项，不以静态报告文件作为唯一证据。

## Non-Goals

- 不承诺单一模型或指标适用于所有行业；阈值由租户/业务场景配置。
- 不在本 change 内实现业务知识内容本身或替代人工验收。

## Dependencies and Boundary

- 依赖 `agent-version-release-and-approval` 提供不可变版本和发布门禁入口，消费 `tenant-aware-rag-and-vector-index`、`tool-gateway-and-egress-policy`、`audit-observability-and-cost-governance` 的运行证据。
- 本 change 不定义租户权限、凭据、工具网络或数据删除规则，只验证这些控制是否有效。
