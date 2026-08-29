## Why

企业经营数据已经沉淀在 Doris 的 SAP 数仓分层、指标、告警和分析方法资产中，但现有 OpenCode 入口只是通用仓库助手，缺少面向经营监控与分析的角色边界、分析流程和只读数据工具约束。现在将其配置为专用经营分析智能体，可以直接复用现有数据资产，降低误用写入型工具和凭经验解释 SAP 字段的风险。

## What Changes

- 配置一个名为“企业经营监控分析助手”的 OpenCode 类型智能体。
- 将 OpenCode 工作区固定为 `/Users/jiantan/ai_assistant/doris`，产物写入会话隔离的 `artifacts/{conversationId}`。
- 绑定可连接的 Doris MCP，只允许通过只读查询、目录、治理、管道、语义和搜索能力获取证据。
- 配置经营分析角色提示词：先确认指标口径和粒度，再查业务语义，最后给出证据、异常、原因和行动建议。
- 配置开场白、常用问题和企业经营主题范围（财务、销售、采购库存、生产、质量、设备、人力）。

## Capabilities

### New Capabilities

- `doris-business-monitor-agent`: 面向 Doris/SAP 企业经营监控与分析的 OpenCode 智能体配置契约。

### Modified Capabilities

无。

## Impact

- 仅影响 BuildingAI 数据库中的智能体、MCP 绑定和展示配置记录。
- 复用现有 OpenCode 服务 `http://127.0.0.1:4096` 与 Doris MCP `http://127.0.0.1:3000/mcp`。
- 不修改应用代码、SQL、Doris 表结构、MCP 服务实现或生产业务数据。
