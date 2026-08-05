## Why

代码连接型智能体（如 OpenCode/SAP 智能助手）的输出来自真实代码工作区，天然可能包含公司内部标识、密钥、个人敏感信息或不适宜内容。当前智能体回复（直播流 + 历史记录）不做任何出口过滤，敏感字会直接展示给终端用户，存在合规与信息安全风险。需要在智能体回复到达用户之前增加敏感字替换能力。

## Why now

- 代码连接型智能体的使用规模扩大，输出内容的敏感信息风险随之上升。
- 平台已有 per-agent 配置模式（如问答标注 `annotationConfig`），可低成本复用同一套配置与展示范式。
- 越早上线，存量脏数据越少；v1 先保证新数据干净，不做历史数据清洗。

## What Changes

- 新增 per-agent「敏感词过滤」配置（开关、敏感词列表、替换串、是否过滤深度思考）。
- 在**全部智能体链路**的 AI 输出上应用替换：opencode / coze / dify 第三方 provider、direct（ToolLoop）普通智能体。
- 直播流式输出与落库历史记录保持一致：用户看到的就是历史里存的。
- 覆盖 assistant 正文与深度思考（reasoning）输出；工具调用内容、HTML 产物文件、用户输入侧不处理（见 Non-goals）。

## Capabilities

### New Capabilities

- `agent-sensitive-word-replacement`: 智能体 AI 回复的敏感字替换能力，含 per-agent 配置、流式过滤、直播与历史一致性。

### Modified Capabilities

_无。_

## Impact

- **后端** `packages/api/src/modules/ai/agents/`：
  - `providers/opencode-chat.provider.ts`、`providers/coze-chat.provider.ts`、`providers/dify-chat.provider.ts`（流式输出拦截 + 落库前过滤）
  - `services/agent-chat-completion.service.ts`（direct 链路 merge 前 TransformStream + onFinish 落库过滤）
  - `services/agents.service.ts`（配置 create/update 透传）
- **类型与数据模型** `packages/@buildingai/types/src/ai/agent-config.interface.ts`、`packages/@buildingai/db/src/entities/ai-agent.entity.ts`（新增 `sensitiveWordConfig` JSON 列）
- **前端** `packages/client/src/pages/agents/detail/_components/configuration/interface/`（新增"敏感词过滤"配置区块）
- **新增核心引擎**：AC 自动机匹配 + 批量替换 + 流式状态机（holdback 缓冲处理跨块分片）
- 依赖：无新增第三方依赖

## Non-goals

- 不处理工具调用的输入/输出内容（可能破坏代码展示，属用户工作区内容）。
- 不处理 HTML 产物文件（`/artifacts/*`）的静态内容。
- 不做用户输入侧过滤（本次仅输出侧）。
- 不做模糊匹配（如插字符绕过），v1 仅精确匹配 + 大小写不敏感。
- 不提供存量历史数据的清洗任务。
