## Why

Agent 当前以可变 JSON 配置和创建者关系运行，广场审核状态不能替代企业开发、测试、生产发布流程。企业客户需要知道线上运行的确切提示词、模型、数据集、工具和凭据策略，并在变更前评测、审批、灰度，异常时快速回滚。

## What Changes

- 新增不可变 Agent 版本快照和开发/测试/预发布/生产环境状态。
- 将模型、提示词、工具、数据集绑定、敏感词、超时、预算和渠道配置纳入版本哈希。
- 提供草稿、提交评审、审批、发布、灰度、暂停、回滚和归档流程。
- 生产运行时固定引用已发布版本，不再直接读取可变 Agent 配置。
- 保存发布人、审批人、变更说明、评测报告、依赖版本和回滚目标。
- 将广场内容审核与企业生产发布拆为两个独立状态维度。
- 对发布目标、依赖和生产指针提供并发控制、幂等发布和显式暂停状态，避免重复点击或过期审批覆盖线上版本。
- 提供管理控制台的版本差异、评测门禁、审批、灰度 cohort 和回滚操作。

## Capabilities

### New Capabilities

- `agent-version-release-and-approval`: 提供 Agent 版本快照、环境晋级、审批、灰度和回滚。

### Modified Capabilities

<!-- None. Existing Agent chat behavior is preserved behind a version resolver. -->

## Impact

- 影响 Agent 实体/服务/控制器、运行时配置读取、客户端编辑器、发布接口和审计。
- 需要新增版本、发布、审批、评测依赖和环境绑定表及迁移。
- 后续 Tool Gateway、RAG 和评测 change 将依赖版本 ID 和快照契约。
- 浏览器验收必须验证版本差异、审批门禁、灰度范围和回滚后的可见状态，而非只验证 API 状态机。

## Non-Goals

- 不在本 change 内实现具体模型评测算法或 Tool Gateway 网络安全策略。
- 不改变现有 Agent 类型和渠道协议；旧 Agent 通过 v1 兼容快照运行。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization` 的租户/项目资源授权和 `ai-evaluation-and-production-readiness` 的门禁结果。
- 消费 `enterprise-secret-and-credential-security` 的凭据引用与 `tool-gateway-and-egress-policy` 的工具策略快照；本 change 不复制这些策略。
