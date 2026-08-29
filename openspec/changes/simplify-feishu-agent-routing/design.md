## Context

飞书服务目前在连接资格、配置保存、启动恢复和消息处理处判断 `isOpencodeDurableTurnsEnabled`，并注入 `OpencodeFeishuGateway` 处理 durable turn、CardKit 问题按钮、停止动作和重启恢复。标准 ERPNext Agent 已经走普通 `/v1/chat-messages` 流式接口；本次将飞书通道固定为这条路径，并移除 OpenCode 专属分支。

## Goals / Non-Goals

**Goals:**

- 让飞书连接的唯一合法目标是 `createMode = direct` 标准智能体。
- 保留标准通道现有的 SSE、CardKit、文本降级、会话连续性、幂等和租约能力。
- 删除飞书模块对 durable gateway、turn mapping、question/stop action 和 recovery 的运行时依赖。
- 保证非标准 Agent 在保存、测试、启用和启动加载阶段均 fail closed。

**Non-Goals:**

- 不删除 OpenCode durable 服务、数据库实体、控制器或其他 Web 入口。
- 不修改 SAP、Bowi、ERPNext MCP 服务器和 Agent 配置。
- 不新增飞书审批、长任务恢复或取消语义。

## Decisions

### 固定标准 Agent 路由

`assertSupportedAgent` 只接受 `createMode === "direct"`，消息处理不再检查 durable 标记或调用 durable gateway。这样能消除“某个 OpenCode Agent 是否开关”的隐式产品契约。替代方案是保留双路由，但会继续维护不可用的飞书 durable 状态和 UI 分支。

### 统一要求已发布 Agent Token

所有飞书连接均使用 `/v1/chat-messages`，因此 `agentAccessToken` 必须存在；连接列表、Dict 兼容迁移和配置校验不再根据 durable 标记放宽 Token 要求。替代方案是保留空 Token 特例，但它无法对应本次唯一的标准 Agent 路由。

### 清理 durable 专属资源

删除 `OpencodeFeishuGateway` 注入、durable CardKit builder、turn mapping 类型与 Redis key、恢复扫描和 card action 的 question/stop 分支。保留通用 CardKit streaming reply 和标准消息处理。替代方案是保留死代码兼容未来 OpenCode，代价是依赖和行为边界继续模糊。

### 控制台只展示标准 Agent

飞书 Agent 选择接口和页面过滤只保留 direct Agent，错误文案统一为“仅支持标准智能体”。不在飞书页面暴露 OpenCode/durable 模式提示或 Token 例外。

## Risks / Trade-offs

- [Risk] 已存在的 OpenCode 飞书连接在升级后无法启动 → 启动加载将其标记为错误并记录标准 Agent 限制；管理员需迁移到 direct Agent。
- [Risk] 旧连接保存了空 Agent Token → 升级后校验失败 → 提供明确的 Token 缺失错误，不自动使用 OpenCode 内部密钥。
- [Risk] 删除 durable CardKit action 后用户不能在飞书停止/回答 OpenCode 任务 → 这是本次明确的范围收缩；标准 Agent 继续支持普通流式文本和卡片。
- [Risk] 删除 gateway 注入影响测试模块装配 → 同步移除构造函数参数、测试 double 和无用 import，并运行 Feishu focused tests。

## Migration Plan

1. 发布代码，使连接校验和启动加载只接受 direct Agent。
2. 删除或停用现有 OpenCode/SAP/Bowi 飞书连接；保留其 Agent 配置供 Web 使用。
3. 创建/选择标准 ERPNext Agent，配置飞书 App ID、App Secret 和已发布 Agent Token。
4. 先测试后启用连接，验证 1:1 文本、CardKit 流式和文本降级。
5. 回滚时恢复上一版本代码；数据库连接表无需迁移，旧凭证仍保留。
