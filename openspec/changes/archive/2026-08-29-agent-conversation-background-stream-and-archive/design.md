## Context

当前智能体聊天有两个前端入口：**site-chat 公开页**（`packages/client/src/pages/agents/site-chat/`，嵌入/公开发布，走 `usePublicAgentChatStream` + `usePublicAgentAssistant`）与 **detail 登录页**（`packages/client/src/pages/agents/detail/`，走 `use-agent-chat-stream` + `useAssistantForAgent`）。两者各自持有一个 `@ai-sdk/react` 的 `useChat({ id })` 实例。

切换会话/新对话时，两个 hook 都会在 effect 中显式调用 `stop()` 并 `setMessages([])`（site-chat 在 `use-public-agent-chat-stream.ts` 的 `initialConversationId` effect；detail 在 `use-agent-chat-stream.ts` 同款 effect）。`stop()` abort 底层 fetch → 服务端 `abortSignal` → opencode 场景还会 `abortSession` 中断远端任务，老会话回复被截断。

会话列表接口：site-chat 侧栏与 detail 侧栏共用 `AgentChatRecordService.listUserConversations`（`GET /ai-agents/:id/chat/conversations`，site-chat 公开别名 `/v1/conversations`）。统一历史 `/ai-conversations/unified` 是独立 SQL（只过滤 `is_deleted` + 匿名），不含 `archived` 概念。全仓库无归档实现。

AI SDK v3 关键事实（已读源码确认）：`useChat({ id })` 在 `id` 变化时**重建全新 Chat 实例**（旧实例在途请求不自动 abort，只有显式 `stop()` 才 abort）；`DefaultChatTransport` 每个请求独立（各自 fetch + transform），并发多流无共享状态问题。

## Goals / Non-Goals

**Goals:**
- 切会话/新对话时老会话流式在后台继续跑完并完整落库
- 后台流事件不污染当前可见会话 UI
- 智能体会话可归档：从 agent 界面会话列表隐藏，统一历史/URL/统计仍可见
- site-chat 与 detail 两入口行为一致

**Non-Goals:**
- 不做多会话实时并发展示（切回不显示实时滚动，拉取完整历史）
- 不做「取消归档」用户入口（`archived_at` 清空仅靠手动改库）
- 不改服务端流式生成/落库/计费逻辑
- 不改通用对话（`ai_chat_record`）与后台「对话记录」管理页

## Decisions

### D1：`useChat` 实例按会话 id keying，切会话不 `stop()`

两个 hook 的 `useChat({ id })` 从固定 id 改为 `id = agent-${agentId}-${anonymousIdentifier}-${conversationId ?? "new"}`。删除切会话 effect 中的 `stop()` + `setMessages([])`（只保留 `conversationIdRef` / `pendingParentIdRef` 等 ref 重置）。

- **理由**：AI SDK v3 的 `id` 变化即重建实例，天然隔离各会话的 messages/status/在途请求；旧实例在途请求不 abort，后台跑完 `onFinish` 触发。
- **备选**：单实例手动解绑（不采用——需自行管理请求生命周期与消息合并，风险高）；多实例组件挂载常驻（D3 备选，改动大）。

### D2：可见会话守卫（`activeConversationRef`）

每个 hook 增加 `activeConversationRef`（当前可见会话 id）。`onData` 回调中：
- `data-conversation-id`：仅当等于当前可见会话才 `navigate` / `setConversationIdState`；否则忽略
- `data-user-message-id` / `data-assistant-message-id`：仅当会话 id 匹配才写入 `messageDbIdMapRef`
- `onFinish` 的 usage hydrate：仅对当前可见会话执行；`finalizeConversationSideEffects`（列表失效）对任何完成会话都执行

- **理由**：同一组件实例的 `onData` 会收到所有会话的事件（transport 回调挂在 Chat 实例上），必须按会话归属过滤；否则背景会话的 id 映射会污染当前线程。
- **备选**：每个会话单独一个 hook 实例（D3 真并发）——事件天然隔离，但架构改动大。

### D3：背景完成状态与列表刷新

新增轻量模块级跟踪器（如 `packages/client/src/pages/agents/site-chat/lib/background-streams.ts`）暴露 `register(convId)` / `unregister(convId)` / `isGenerating(convId)` / `subscribe(listener)`。`onFinish` 时 `unregister` 并 `invalidateQueries` 会话列表。侧栏对 `isGenerating` 的会话显示「生成中」徽标。

- **理由**：历史列表需要知道哪些会话还在后台生成；不引第三方状态库，用模块级 `Set` + 简单订阅即可。
- **备选**：把生成中状态存进会话记录（服务端改字段）——过度设计，服务端无法知道客户端是否可见。

### D4：归档数据模型

`ai_agent_chat_record` 新增列 `archived_at timestamptz NULL`（entity + migration）。时间戳语义优于布尔 `is_archived`：天然可排序、未来可做「最近归档」视图，且与现有 `is_deleted` 布尔软删风格区分。

- **备选**：布尔 `is_archived`（无排序能力，需另加时间）；复用 `metadata`（查询过滤弱、无类型约束）。

### D5：归档 API

- `PATCH /ai-agents/:id/chat/conversations/:conversationId/archive`，body `{ archived: boolean }`
- 归属校验与现有 delete 一致：`record.agentId === agentId`、`record.userId === playground.id`（匿名用户匹配 `anonymousIdentifier`）；不存在/非本人 → notFound / forbidden
- `AgentChatRecordService.archive(conversationId, userId, archived)`：`archived=true` 设 `archived_at = now()`，`archived=false` 清空（服务端支持回滚，但 UI 不暴露）
- `listUserConversations` 默认 `archived_at IS NULL`，新增 `includeArchived` 查询参数（默认 false）供审计

- **备选**：POST/DELETE 两个端点（对称但多余）；仅 `archive` 单向端点（无法回滚，不利于测试）。

### D6：归档 UI（site-chat + detail 两侧栏）

两处会话条目各加归档按钮（hover 显示、`Archive` 图标 + 确认弹窗）。site-chat 是公开页，当前用 `navigate` 跳历史；detail 页有现成 `DropdownMenu` 模式。归档成功后 `invalidateQueries` 会话列表（site-chat 的 `public-agent-conversations` key / detail 的 `agents/chat/conversations` key）。

- **注意**：site-chat 公开页删除/归档接口走 `AgentPublicAccess`（匿名可操作），权限点在 `agent-chat.controller.ts` 的 `@AgentPublicAccess` + 归属校验，与 delete 一致。

### D7：embed 自动恢复跳过已归档会话

`useEmbedConversationResume` 用 localStorage `buildingai_last_conv_*` 恢复上次会话；恢复前先 `getConversation` 校验，若 `archived_at` 非空则 `clearLastConversation` 并停在首屏，不再跳回。

- **理由**：归档后 embed 刷新不应把用户拽回已归档会话；这属于"其它地方仍可见"的例外——URL 直达仍可看，但自动恢复不主动跳。

## Risks / Trade-offs

- [背景流占用连接与内存，直到跑完] → 流完成即释放；opencode 单 turn 有 15 分钟上限，idle watchdog 兜底；可在后续加"后台流数量上限"
- [旧 `onData` 事件误污染新会话 UI] → D2 可见会话守卫按会话 id 过滤全部事件副作用
- [归档后列表接口默认排除，若存在依赖旧行为的调用方] → 仓库内仅两处侧栏消费该接口；`includeArchived` 参数兜底
- [背景会话计费/usage 显示] → 落库逻辑在服务端不变；usage 仅对可见会话 hydrate（D2）
- [并发多流下服务端连接压力] → 每流独立请求，跑完即关；与现有"多标签页同时聊不同会话"等价

## Migration Plan

1. DB：新增 `archived_at` 列（TypeORM migration，`ALTER TABLE ai_agent_chat_record ADD COLUMN archived_at timestamptz NULL`），全量 NULL，不影响现有查询
2. 服务端：先加 archive 方法与端点（向后兼容，UI 未上线不影响任何行为）
3. 客户端：先改两个 stream hook（D1/D2/D3），再改侧栏列表（D4/D5/D6），最后 embed 恢复守卫（D7）
4. 回滚：客户端切会话逻辑 revert 即恢复"切换即中断"行为；归档端点保留但无 UI 不影响；`archived_at` 列可删可留

## Open Questions

- 后台流完成时是否需要 toast 提示？（当前倾向：不提示，仅列表「生成中」→ 完成态刷新）
- site-chat 公开页匿名用户归档后，`buildingai_last_conv_*` 缓存的旧会话如何处理（D7 已覆盖）？
- 是否需要「归档会话」单独视图（如归档 tab）？（当前 Non-goal，统一历史已可见）
