## Why

OpenCode 型智能体对话已有多步思考与工具调用，但消息 Token 用量始终为 0，也无法按平台积分规则扣费。OpenCode SSE 已提供 `tokens` / `cost`，BuildingAI 侧尚未接入。Why now：用量弹窗与侧栏「智能体消耗」对用户可见且明显错误，影响信任与商业化计费。

## What Changes

- 从 OpenCode 事件汇总本轮 token 用量，映射为平台 `ChatMessageUsage`
- 流结束写入 `data-usage`，助手消息落库 `usage` / `userConsumedPower`
- 按控制台「智能体创建类型 → OpenCode」的 points 计费规则预检积分并扣费（与 Dify/Coze 一致）
- 调试模式（`isDebug`）不计费，但仍展示真实 token
- 侧栏计费文案继续读 `chatBillingRule`；管理员将 OpenCode `points` 配为 >0 后不再显示「免费」

**Non-goals**

- 不按 OpenCode 的 USD `cost` 直接扣费（仍用平台 tokens→积分换算）
- 不改造全局 `/chat` 计费
- 不回溯修复历史已落库的 0 用量消息
- 不新增独立计费配置 UI（复用现有 createTypes points）

## Capabilities

### New Capabilities

- `opencode-token-billing`: OpenCode 对话 token 汇总展示与平台积分扣费对齐

### Modified Capabilities

- （无）既有 `openspec/specs/` 以领域能力为主；本变更为平台 Agent 集成增量

## Impact

- **API：** `OpencodeChatProvider`、可选 `AgentBillingHandler` 复用、`AgentConfigService` createTypes `opencode` 计费读取
- **Client：** 复用现有 `MessageUsage` / `data-usage` 水合，无新 UI 组件
- **Ops：** 控制台需为 OpenCode 类型配置 `billingMode: points` 且 `points > 0` 才会实际扣积分
- **OpenSpec：** 覆盖 `opencode-agent-integration` 中「不做 token 计费对齐」的非目标
