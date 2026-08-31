## Why

OpenCode 型智能体的浏览器流、远端 session、BuildingAI 消息持久化和前端 Chat 状态彼此独立，导致新会话无响应、历史缺失或错配、重复恢复、旧 Stop 误杀新回合以及已扣费但未落库。Why now：这些问题已经在运行日志中反复出现，现有多个局部 change 仍依赖竞态敏感的 metadata、SSE 与轮询补丁，继续分别修补无法建立可验证的一致性边界。

## What Changes

- 为每个 OpenCode 回合建立持久化、可寻址的 turn；客户端生成的 turn ID 同时作为请求幂等键，最小无凭据执行快照支持派发前重启恢复，并使用稳定 OpenCode user message ID 关联本地输入、远端执行与最终回复。
- 定义单会话单活跃 turn、显式状态迁移和提交边界；只有消息、用量、计费结果和会话统计成功提交后，turn 才可变为完成。
- 将历史读取变为纯 BuildingAI 数据库读取；恢复由后台协调器基于数据库租约、OpenCode session status 和精确 parent message 关系执行，且必须幂等。
- Stop 和状态查询改为 turn-scoped；过期 Stop 不得影响后续回合，OpenCode question 在交互能力另行设计前由服务端确定性拒绝而不能挂死回合。
- 前端以稳定 conversation/turn 身份展示“持久化历史 + 当前回合状态”，不再依赖 provisional Chat 重键或把 OpenCode `session.idle` 当作提交完成。
- durable 路径不订阅 OpenCode 全局 SSE；服务端按回合 single-flight 查询 OpenCode 状态，客户端只轮询 BuildingAI turn status，完成后刷新一次持久化历史。
- durable 路径停止读写 OpenCode 状态 metadata；会话 API 短期从 turn 表计算同名兼容字段用于灰度切换。

**Non-goals**

- 不建设通用事件平台、Redis/BullMQ turn 队列或完整 OpenCode 历史镜像。
- 不在本 change 中实现 worktree/container 隔离、权限策略、附件/制品安全加固。
- 不改变 Dify、Coze 或原生 Agent 的回合模型。
- 不保证 BuildingAI 与 OpenCode 内部消息数量相同；保证的是每个用户回合确定、完整且恰好一次的 BuildingAI 投影。

## Capabilities

### New Capabilities

- `opencode-turn-consistency`: OpenCode 回合的持久身份、单活跃约束、原子提交、精确恢复、turn-scoped 控制及确定性前端投影。

### Modified Capabilities

- `chat-processing-indicator`: OpenCode 使用 durable turn 的 `accepted/running/committing` 状态驱动回合级活动指示；其他流式智能体仍使用 `submitted/streaming`。

## Impact

- **DB：** 新增 OpenCode turn 持久化结构、带 runtime 指纹的会话映射、唯一约束与正式版本 migration；消息保存和积分扣减需要共享事务边界。
- **API：** OpenCode provider、session API、恢复服务、聊天/历史/Stop/question/status 接口。
- **Client：** Agent detail/site-chat 的发送、活动状态、Stop、完成刷新与 Regenerate 策略。
- **Compatibility：** 会话列表短期继续从 turn 表投影 `opencodeTurnStatus` 响应字段，但不再持久化第二份 durable 状态。
- **Dependencies：** 复用 PostgreSQL、现有 OpenCode `/session/status`、稳定 `messageID` 与 session message parent 关系；不新增运行时基础设施。
