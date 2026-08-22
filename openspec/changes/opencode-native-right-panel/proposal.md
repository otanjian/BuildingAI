## Why

OpenCode 智能体目前把会话渲染在 BuildingAI 的通用聊天容器中。虽然后台已经通过 OpenCode API 保存会话、转发事件和处理问题，但用户在刷新、切换会话或等待工具执行时看不到与 OpenCode 原生界面一致的任务进展，交互也容易出现“主会话有状态、右侧没有内容”的割裂感。

## What Changes

- 在 OpenCode 智能体工作台增加可展开的同构右侧面板。
- 通过 BuildingAI 授权的 OpenCode API 代理读取会话消息、工具调用和实时事件，不嵌入跨源 iframe。
- 复用现有发送、停止、问题回答和持久化能力，让侧栏输入与主会话使用同一个 conversation/turn。
- 在侧栏中显示 OpenCode 风格的用户消息、文本、思考/工具进度和结构化 question 卡片。
- 将现有 Workspace 文件树与侧栏整合为“对话 / 文件”标签，并保留刷新后的会话恢复。

## Capabilities

### New Capabilities

- `opencode-native-right-panel`: OpenCode 智能体的 API 驱动同构侧栏。

### Modified Capabilities

- `opencode-agent-chat`: 右侧面板复用现有 OpenCode 会话、事件和问题交互。

## Impact

- Client Agent 工作台、OpenCode 面板组件和服务层查询封装。
- 不新增数据库字段或 OpenCode 服务端改动；继续使用现有会话 metadata、turn projection 和 SSE 代理。

## Non-goals

- 不把 OpenCode 原生网页通过 iframe 嵌入 BuildingAI。
- 不复制一套新的 OpenCode 执行引擎或第二个会话。
- 不改变现有非 OpenCode 智能体聊天布局。
