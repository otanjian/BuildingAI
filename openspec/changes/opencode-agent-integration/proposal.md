## Why

BuildingAI Agent 工作台需要把「对话输入与结果展示」留在本平台，把编码/报告执行交给本机 OpenCode。现有 Dify/Coze 第三方 Agent 模式已证明可行，但缺少 OpenCode 对接与会话级 HTML 报告预览。Why now：本服务器已有固定业务仓库 `/home/opencode/opencode`，产品需要在对话框内流式看到工具步骤，并对产出的报告/看板 HTML 做 iframe 预览。

## What Changes

- 新增 Agent `createMode: "opencode"`，对话请求委托给本机 OpenCode server
- BuildingAI 会话与 OpenCode session 按 conversationId 1:1 映射；会话消息（含工具步骤）完整落库，工作台可查看全部历史
- 固定业务仓库执行；HTML 等产物按 L2 写入 `artifacts/<conversationId>/`，会话间产出隔离
- 流式将 OpenCode 读写文件、终端等步骤映射为对话框 tool parts
- 对报告/看板 HTML 提供鉴权代理 + iframe（WebPreview）预览
- Agent 配置通过 `thirdPartyIntegration.opencode` 指向 OpenCode baseUrl / workspace / 产物目录模板

**Non-goals**

- 不改造平台全局 `/chat` 为 OpenCode 入口（仅 Agent 工作台）
- 不做 git worktree（L3）物理工作树隔离
- 不做 BuildingAI 与 OpenCode token 计费对齐
- 不做运行时权限弹窗（MVP 用服务端策略自动放行安全操作）
- 不把整页 HTML 塞进消息内 sanitize 渲染（与 `chat-html-echarts-render` 分工）

## Capabilities

### New Capabilities

- `opencode-agent-chat`: OpenCode 型智能体对话委托、会话映射、流式工具步骤、L2 产物隔离与 HTML iframe 预览

### Modified Capabilities

- （无）现有 `openspec/specs/` 以 EHCS 等领域能力为主；本变更为平台 Agent 集成，不修改既有领域需求规格

## Impact

- **API：** `packages/api` Agent 模块（createMode、OpencodeChatProvider、artifact 代理接口）
- **Client：** Agent 工作台消息渲染（tool 步骤 + HTML artifact iframe）
- **UI：** 复用 `@buildingai/ui` `WebPreview` / GenericTool
- **Ops：** 依赖本机 OpenCode serve（workspace=`/home/opencode/opencode`）
- **DB：** 会话元数据存 OpenCode sessionId / artifact 根路径（尽量复用现有 conversation 字段，避免大迁移）
