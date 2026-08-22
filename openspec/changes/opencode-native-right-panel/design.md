## Design

### 面板结构

OpenCode 智能体的外层横向可调整布局保留主聊天区，在右侧面板内增加两个标签：

- `对话`：展示 OpenCode session 的消息、工具/任务状态、实时文本和 pending question。
- `文件`：复用现有 workspace 文件树和文件预览。

右侧面板默认在桌面端打开，移动端仍自动关闭。面板关闭或切换标签不会销毁主聊天会话。

### 数据与同步

侧栏首先调用现有的 `GET .../opencode-session/messages` 读取 OpenCode session 快照；当会话存在运行中的 turn 时，通过现有 `.../opencode-session/events` SSE 接收消息和 part 更新，事件流异常时使用定时刷新作为兜底。收到 idle/error 后失效快照查询，最终以 BuildingAI 持久化消息为准。

侧栏输入直接调用 `AssistantContext` 的 `onSend` / `onStop`，因此不会创建第二个 OpenCode session。问题回答直接复用 context 中的 reply/reject transport，问题状态以服务端持久化 metadata/turn projection 为刷新边界。

### 消息映射

OpenCode 原始消息只在客户端做显示层映射：text/reasoning 作为内容，tool part 显示工具名、输入摘要和 running/completed/error 状态，question tool part 不再渲染为普通工具行，而由共享 `OpencodeQuestionCard` 负责交互。原始 id 和时间顺序保留，便于 SSE 更新时替换同一条 part。

### 失败策略

无 OpenCode session 的新草稿显示空状态，不阻塞主聊天；API/SSE 失败显示轻量错误提示并保留重试按钮，不清空已有快照。权限仍由 BuildingAI API 代理校验，客户端不接触 OpenCode 凭据。
