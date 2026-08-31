## Context

当前 MCP 服务保存 URL/headers，Agent Chat 和自动化路径各自装配工具；`requireApproval` 默认可关闭，缺少统一 SSRF、风险和幂等执行点。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 让 MCP、Agent Chat 和控制台工具经过统一注册、策略决策和出口代理；自动化、渠道和 OpenCode 直连路径作为明确例外保留。
- 兼容现有 MCP/SAP/ERP 工具，同时提供风险和审批门禁。
- 保证每次工具调用都有可脱敏审计和可控重试。

**Non-Goals:**

- 不实现具体业务系统的领域权限或工作流审批表单。
- 不直接替换模型编排器；网关作为其工具执行边界。

## Decisions

1. **网关而非分散守卫。** Tool Gateway 是唯一出站执行入口，Controller/Agent 层只能提交已签名上下文；避免新增入口绕过策略。
2. **策略快照随执行传播。** 策略决策生成带 `policyVersion`、approvalId、tenantId、agentVersionId、expiry 和 nonce 的内部上下文，网关验证后才发起连接。
3. **出口代理 + 解析校验。** 优先固定出口代理控制域名/IP/证书和审计；代理前后做解析检查以防 DNS rebinding。相比应用内散落 URL 检查，可统一覆盖 MCP/HTTP。
4. **风险默认分级。** READ 可自动执行，WRITE/SENSITIVE 需要预授权或审批，DESTRUCTIVE 默认拒绝并支持双人审批；租户可收紧但不能放宽平台硬上限。
5. **幂等优先于盲目重试。** 读操作按错误类型安全重试，写操作必须提供幂等键或被拒绝；避免模型重复调用造成业务副作用。

替代方案：仅在 UI 增加“确认”无法约束 API/自动化；仅依赖第三方 MCP 自报安全能力无法统一审计和出网，因此不采用。

## Risks / Trade-offs

- [Risk] 旧 MCP 不支持 schema/幂等 → Mitigation：先以适配器包装，未声明能力默认只读/人工审批，逐步升级。
- [Risk] 出口代理增加延迟和单点 → Mitigation：多实例、连接池、健康检查和按风险降级。
- [Risk] 误判私网目标影响企业内网集成 → Mitigation：受保护网络策略和人工审核的显式例外，例外短期有效并审计。
- [Risk] 模型输出参数含敏感信息 → Mitigation：schema 分类、字段级脱敏、大小限制和审计摘要。

## Migration Plan

1. 盘点所有 MCP、天气、附件、RAG、SAP/ERP、数据库和渠道工具，生成注册清单和风险等级。
2. 部署只读 Tool Gateway 适配器，先做 shadow policy 决策并比较旧路径。
3. 将 READ 工具切换到网关；未注册或网络不合规工具进入隔离队列。
4. 将 WRITE/SENSITIVE/DESTRUCTIVE 接入审批、预授权、幂等和出口代理。
5. 禁止 Agent Chat 直接创建外部客户端，关闭其旧路径 feature flag；自动化、渠道和 OpenCode 可继续使用既有直连，后续专项 change 再迁移。
6. 出现误放行或大面积失败时按工具/租户回退到只读或停用，而不允许恢复为无限制直连。

## Open Questions

- 企业内网连接是否统一由客户侧 agent/relay 承担，可在网络拓扑评审后选定，不改变网关策略契约。

## Browser Acceptance Design

- 目标控制台入口：`/console/ai/tools`、`/console/ai/mcp` 或等价的 Tool Registry/Approval 页面。
- 种子数据：一个 READ 工具、一个 WRITE 工具待审批、一个指向私网/元数据地址的测试工具、一个已启用且可紧急停用的工具。
- 正向流程：查看注册工具 → 打开待审批调用 → 检查风险和脱敏参数 → 审批 → 确认只执行一次 → 查看记录。
- 负向流程：运行 SSRF 测试 → 验证 UI denial；停用工具 → 再次调用验证即时拒绝；普通成员访问管理页验证无权限。
- 证据：截图/录屏、审批 ID、tool/policy version、网络拒绝状态和审计事件 ID；不得展示凭据或完整敏感参数。
- 浏览器自动化必须通过真实控制台操作 sandbox tool；不能使用浏览器直接调用内部 API 代替“浏览器验收”。
