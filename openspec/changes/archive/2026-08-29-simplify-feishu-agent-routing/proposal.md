## Why

飞书通道当前同时包含标准 Agent 和 OpenCode durable Agent 的分支，带来了 durable 开关、长任务状态和权限语义等不必要的复杂度。当前产品只需要通过飞书接入标准智能体（现阶段为 ERPNext 系统操作助手），因此应收窄通道边界，并清理飞书模块中不再需要的 OpenCode/SAP/Bowi 专属代码和文档。

**Why now:** 飞书的实际业务入口已经确定为标准 ERPNext 智能体，继续保留 durable OpenCode 入口会造成控制台选择、凭证和运行时行为不一致。

## What Changes

- 飞书仅允许标准 Agent（`createMode = direct`）；OpenCode、Coze、Dify 及其他第三方智能体均不可配置或启动飞书连接。
- 删除飞书通道对 `durableTurnsEnabled` 的判断、路由、CardKit 交互和恢复逻辑；不改变其他入口的 OpenCode durable 能力。
- 标准 Agent 通过已发布 Agent Token 调用普通 `/v1/chat-messages` 流式接口。
- 保留标准 Agent 的 CardKit 流式展示、文本降级、会话 ID 和事件幂等能力。
- 更新控制台和接口提示，明确飞书只支持标准 Agent。

## Capabilities

### New Capabilities

- `feishu-agent-routing`: 限定飞书通道仅路由标准 Agent。

### Modified Capabilities

- 无（当前飞书能力仅在变更目录中定义，未存在于 `openspec/specs/`）。

## Impact

- 影响 `packages/api/src/modules/channel/feishu/` 的 Agent 校验、配置保存、启动加载和消息路由。
- 影响飞书连接控制台的 Agent 选择和模式文案。
- 需要更新 API 单元测试和连接配置测试。
- 删除飞书专用 OpenCode durable gateway 及其注入；通用 OpenCode 持久化 turn 服务及 SAP Bowi MCP 本身不在本次修改范围内。

## Non-goals

- 不删除 OpenCode durable turn 后端能力或数据库表。
- 不把 SAP/Bowi 改造成 direct Agent，也不通过飞书接入它们。
- 不新增 SAP 工具、SAP 权限模型或飞书用户绑定模型。
- 不为飞书增加长任务恢复、可靠取消或审批事务能力。
