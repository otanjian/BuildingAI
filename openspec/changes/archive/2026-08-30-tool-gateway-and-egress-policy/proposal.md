## Why

Agent 目前可以从多个入口初始化 MCP 客户端并调用外部系统，工具默认审批关闭，URL、headers、超时和风险策略没有统一执行点。企业 AI 一旦连接 SAP、ERP、数据库或内部 HTTP 服务，必须把“能否调用、调用什么、发往哪里、是否需审批”收敛到一个可审计的 Tool Gateway。

## What Changes

- 建立统一工具注册、能力声明、风险分级、输入输出 schema 和版本模型。
- MCP、Agent Chat 和控制台工具通过 Tool Gateway 执行；自动化、渠道和 OpenCode 允许保留既有直连路径，由各自 change 负责其专项安全边界。
- 增加租户/Agent 版本绑定、RBAC/ABAC、审批、预授权、超时、并发、重试和幂等策略。
- 实现域名/IP/端口/协议 allowlist、SSRF 和 DNS rebinding 防护及受控出口代理。
- 高风险写、敏感读取和破坏性操作默认拒绝或要求单人/双人审批。
- 对工具输入、输出、目标系统、策略决定和结果写入统一审计与成本事件。
- 覆盖内置天气、附件、RAG、规划等工具以及 MCP/HTTP/SAP/ERP 工具，禁止以“内置工具”名义绕过网关。
- 提供控制台工具注册、风险/出网策略、审批队列、连接测试、紧急停用和执行记录页面。

## Capabilities

### New Capabilities

- `tool-gateway-and-egress-policy`: 提供统一工具执行、风险审批和网络出站策略。

### Modified Capabilities

<!-- None. Existing tools migrate behind a compatible gateway. -->

## Impact

- 影响 `AiMcpServer`、Agent Chat、MCP 控制器和工具类型定义；自动化、渠道和 OpenCode 的既有直连路径不在本 change 的强制迁移范围内。
- 需要新增工具注册/策略/审批/出口配置实体、代理组件和执行上下文签名。
- 连接检查、工具发现和运行时错误语义会统一为网关契约。
- 浏览器验收必须同时覆盖低风险允许、高风险待审批、SSRF 阻断、重放幂等和紧急停用。

## Non-Goals

- 不在本 change 内实现所有第三方业务动作；只提供统一执行边界。
- 不替代租户授权、凭据加密、成本账本和审计实体，而是消费这些能力。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization`、`enterprise-secret-and-credential-security` 和 `audit-observability-and-cost-governance`。
- `agent-version-release-and-approval` 提供工具绑定快照；本 change 不允许 MCP/Agent Chat/控制台工具绕过网关。自动化、渠道和 OpenCode 直连作为明确边界例外保留，并由各自专项 change 管理。
