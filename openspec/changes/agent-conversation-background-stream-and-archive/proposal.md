## Why

当前在智能体聊天页「新对话」或切换历史会话时，若老会话仍在流式生成，前端会立即 `stop()` 并 abort 请求，导致老会话回复被截断、opencode 报告生成被中断；同时会话记录只能「删除」没有「归档」，智能体会话一旦从历史列表消失就不可逆。

## What Changes

- 新会话/切换会话不再中断老会话的流式输出：老会话在后台继续跑完并完整落库（**静默后台完成**，切回会话可看到完整回复）
- 智能体会话新增「归档」：会话从智能体界面（site-chat 公开页 + detail 登录页）的会话记录中隐藏，但在统一历史、直接 URL、后台统计等处仍可见；归档不可逆（不提供取消归档入口）
- 归档用软标记（新增 `archived_at` 时间戳列），不删除数据、不影响统一历史接口

**Non-goals**

- 不做多会话实时并发展示（切回后不看到实时滚动的流，改为拉取完整历史）
- 不做「取消归档」用户入口（数据仍保留在库，可手动改库恢复）
- 不改动服务端流式生成与落库逻辑（abort 由客户端发起，服务端零改动）
- 不改通用对话（`ai_chat_record`）与后台「对话记录」管理页

## Capabilities

### New Capabilities

- `agent-conversation-background-stream`: 切会话/新对话时老会话流式在后台继续完成，历史列表可见「生成中」状态，切回会话展示完整回复
- `agent-conversation-archive`: 智能体会话归档（软标记），从智能体界面会话列表隐藏，其它入口仍可见；支持归档 API 与列表过滤

### Modified Capabilities

- （无）现有 specs 中 `unified-chat-history` 只要求统一历史显示未软删会话；归档不改变其行为（归档会话仍属未删除，继续可见），故不改其需求

## Impact

- **DB：** `ai_agent_chat_record` 新增 `archived_at timestamptz NULL` 列
- **API：** `AgentChatRecordService` 新增归档方法；`listUserConversations` 默认排除已归档会话；`agent-chat.controller.ts` 新增归档端点
- **Client：** `usePublicAgentChatStream` / `use-agent-chat-stream` 改为按会话 id 切换 `useChat` 实例并保留后台流；site-chat 与 detail 侧栏会话条目加归档按钮
- **Services：** `packages/@buildingai/web/services` 新增归档 mutation 与列表参数
- **统一历史：** `/ai-conversations/unified` 不改（归档会话继续可见）
