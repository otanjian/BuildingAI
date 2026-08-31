## Context

当前实现位于 `packages/api/src/modules/channel/feishu/` 和 `packages/client/src/pages/console/channel/feishu/`。后端使用 `Dict` 的 `feishu-agent-channel` 分组，key 是 `agentId`；运行时连接、状态 Map 和 Redis key 也以 `agentId` 为隔离边界。前端 `/console/channel/feishu` 是一个选择智能体后直接编辑的单页表单。飞书连接只允许标准 Agent，其他智能体运行时不属于本通道范围。

原方案将多个连接继续放在 Dict 中，并依赖服务层扫描实现 App ID 唯一性。这个方案在并发保存、多 API 实例、重复历史配置和删除中的长任务场景下不具备足够的原子性，因此本设计改用专用连接实体。

## Goals / Non-Goals

**Goals:**

- 将飞书连接变成有稳定主键、有唯一约束、有生命周期的持久化资源。
- 在多 API 实例下保证一个连接最多由一个实例运行 Feishu WebSocket。
- 保持旧配置、历史会话和已启用通道的兼容性，并对历史冲突提供可见、可修复的状态。
- 给控制台提供分页列表、筛选、创建、编辑、测试、启停和删除能力。
- 使删除、智能体删除、凭证更新和运行态回写具有明确的并发语义。

**Non-Goals:**

- 不允许一个 App 同时路由多个 Agent，也不做按消息内容的动态路由。
- 不改变 Feishu WebSocket、CardKit 或标准 Agent 的消息协议。
- 不迁移历史消息，也不合并旧连接之间的会话。

## Decisions

### 1. Use a dedicated connection table as the source of truth

新增 `feishu_channel_connection` 实体，至少包含：

- `id`：连接 UUID，作为所有新 API、运行态和 Redis key 的主键；
- `name`：连接名称；
- `agentId`：关联 Agent，使用外键并限制删除；
- `appId`、`appSecret`、`agentAccessToken`：凭证字段，三者均使用版本化 AES-256-GCM 信封加密；标准 Agent Token 为必填；
- `enabled`、`onlyMentioned`、`migrationStatus`、`createdAt`、`updatedAt`。

对规范化后的 `appId` 建立唯一索引，停用连接仍占用 App ID，删除后才允许重新绑定。对 `(agentId, normalizedName)` 建立唯一索引，避免同一智能体出现无法区分的连接名称。`migrationStatus` 至少包括 `active`、`legacy`、`conflict`、`orphaned`。

**Rejected alternative:** 继续使用 Dict 数组或仅用 Dict 扫描。Dict 的唯一约束只覆盖 `(key, group)`，无法原子保证 App ID 唯一，也不适合分页、外键、并发更新和审计状态。

### 2. Encrypt new credentials and migrate old credentials explicitly

新增 `FEISHU_CREDENTIAL_ENCRYPTION_KEY`，使用 32 字节密钥和随机 nonce/tag 保存密文，密文携带版本号，便于未来轮换。缺少密钥或无法解密时，连接不得启动，状态显示为配置错误；日志只能输出连接 ID 和脱敏 App ID。

旧 Dict 配置先进入迁移预检：

1. 校验 Agent 是否存在、配置格式和 App ID；
2. 按规范化 App ID 分组识别重复绑定；
3. 无冲突记录导入连接表并标记 `legacy`；
4. 冲突记录不强行覆盖或丢弃，导入为 `conflict`、强制停用，并保留待处理的旧配置引用；
5. 孤儿 Agent 记录导入为 `orphaned`、强制停用；
6. 迁移摘要记录成功数、冲突数和孤儿数，控制台可见；
7. 全部成功或人工确认后，旧 Dict 记录才可归档/删除，默认保留一段可回滚窗口。

迁移必须幂等：使用旧 Dict key 作为 `legacySourceKey` 唯一标识，重复启动不会创建第二条连接。旧配置的历史会话 key 在迁移期间通过兼容别名读取；新消息统一使用 connection ID key。

**Rejected alternative:** 启动时直接重写或删除旧 Dict。重复 App ID 会导致部分配置丢失，服务回滚也无法恢复；凭证迁移必须是可观察、可重试、可回滚窗口明确的过程。

### 3. Use unambiguous API namespaces

新 API 使用独立 `/connections` 命名空间，避免 UUID 类型的 Agent ID 与 Connection ID 混淆：

- `GET /consoleapi/feishu-channel/connections`：分页、筛选、排序返回连接列表；
- `POST /consoleapi/feishu-channel/connections`：创建连接，默认停用；
- `GET /consoleapi/feishu-channel/connections/:connectionId`：返回非敏感详情；
- `PUT /consoleapi/feishu-channel/connections/:connectionId`：更新连接；
- `POST /consoleapi/feishu-channel/connections/test`：测试未保存配置；
- `POST /consoleapi/feishu-channel/connections/:connectionId/test`：测试已保存连接或提交的新凭证；
- `POST /consoleapi/feishu-channel/connections/:connectionId/toggle`：显式启用/停用；
- `DELETE /consoleapi/feishu-channel/connections/:connectionId`：删除连接。

现有 `GET /feishu-channel` 和 `PUT/POST /feishu-channel/:agentId...` 仅作为标记为 deprecated 的 legacy adapter，且只读写旧 Dict 配置；它们不得根据一个模糊的 UUID 在新连接和 Agent 之间猜测。新前端只访问 `/connections` API。创建和更新的保存动作不隐式启用连接，启用必须通过独立 toggle。

列表使用服务端分页，支持 `page`、`pageSize`、`agentId`、`keyword`、`enabled`、`connectionState`，默认按 `updatedAt DESC, id DESC` 排序。响应包含 `hasAppSecret`、`hasAgentAccessToken` 等布尔元数据，但不包含原始密钥。

**Rejected alternative:** 让新旧接口共享 `/:id` 并按查找结果猜测含义。Agent ID 和连接 UUID 都是合法 UUID，无法给出稳定且可审计的路由语义。

### 4. Enforce ownership and lifecycle at the database and service boundaries

保存、改 App ID、启用和删除都以连接表行作为边界。唯一 App ID 由数据库唯一索引最终保证，服务层只负责返回友好错误；并发保存即使同时通过预检查，也只能有一个事务成功。

Agent 使用外键 `ON DELETE RESTRICT`：存在飞书连接时不允许直接删除 Agent，管理员必须先停用并删除/迁移连接。Agent 模式不满足要求时，连接可以保留但必须自动停用并显示“智能体不再支持该通道”。

编辑已启用连接时，先停止旧运行实例，再原子保存新凭证；启动失败时连接保持 `enabled=true` 但 `connectionState=error`，绝不回退到旧 App 凭证继续运行。新建连接始终先保存为停用状态。

删除流程先标记 `deleting` 并阻止新的事件进入，再关闭 WebSocket、停止后续 CardKit 回写，最后删除连接记录。已在途的标准 Agent 请求使用 AbortController；无法立即中止时，完成回调必须再次检查连接状态，不得向已删除连接发送回复。Redis 历史 key 通过 SCAN 分批清理，清理失败只记录告警，不恢复已删除配置。

### 5. Add a per-connection distributed runtime lease

每个已启用连接启动前竞争 `feishu:lease:<connectionId>`，值为随机 owner token，TTL 30 秒；持有者每 10 秒续租，释放时使用 token 比较后删除。丢失租约时必须关闭本地 WebSocket，并停止处理新事件。只有租约持有者能把状态标记为 `connected`。

事件幂等 key、会话 key 和 CardKit observer 全部以 `connectionId` 为前缀。事件在执行业务前检查连接仍为 enabled/active 且当前实例仍持有租约。租约只防止多实例重复建立连接，事件幂等仍保留，用于处理 Feishu 重投和进程切换窗口。

**Rejected alternative:** 假设生产环境永远只有一个 API 实例。扩容、滚动发布或故障切换都会打破该假设，导致同一个 App 建立多个长连接并重复回复。

### 6. Make the console list-first and connection-oriented

保留 `/console/channel/feishu` 为列表页，新增 `/console/channel/feishu/new` 和 `/console/channel/feishu/:connectionId` 表单页。列表提供服务端分页、搜索/筛选、连接状态、迁移冲突提示和行级操作；表单提供连接名称、智能体、App 凭证、标准模式 Token、群聊 @ 策略和独立测试。

智能体选择不能固定依赖前 100 条数据；使用已有控制台智能体接口的分页/关键词能力，或增加仅返回受支持智能体的分页选项接口。编辑时用 `hasAppSecret`/`hasAgentAccessToken` 显示“已配置”，空字段表示保留原值。

同一智能体可以在多条表单中重复选择；同一 App ID 冲突时展示脱敏冲突信息。`conflict`、`orphaned` 连接只能编辑修复或删除，不能启用。

## Risks / Trade-offs

- **新增数据库表和加密密钥增加部署复杂度** → 提供显式 migration、启动前密钥检查、迁移 dry-run/摘要和回滚窗口；不具备密钥时 fail closed。
- **历史 Dict 配置可能有重复 App ID** → 迁移前预检，冲突记录强制停用并可见，不自动选择或覆盖。
- **Redis 租约续租或 Redis 短暂不可用** → 租约丢失时安全关闭连接；事件幂等和数据库配置仍保留，Redis 恢复后由启用连接重新竞争。
- **删除与在途响应存在竞态** → deleting 状态、AbortController、observer 取消和发送前二次状态检查形成多层保护。
- **连接数量增加会提高资源消耗** → 服务端分页、运行连接数监控，并在后续增加租户级连接上限；本期不静默限制管理员新增。
- **旧版本回滚读取不到新表连接** → 新连接不自动回写旧 Dict；回滚只保证 legacy 连接可用，发布说明要求回滚前停用新连接。

## Migration Plan

1. 增加连接表、唯一索引、外键和加密密钥配置；部署 migration，不启用新连接运行逻辑。
2. 执行只读 dry-run，输出有效、重复 App、格式错误和孤儿配置摘要；存在冲突时不自动启用冲突记录。
3. 执行幂等导入：有效旧记录进入连接表并加密凭证，保留 Dict 原记录和 `legacySourceKey`。
4. 启用双读：新运行时只读取连接表，legacy adapter 继续服务旧前端；验证连接数量、状态、会话和事件幂等。
5. 发布新前端，切换到 `/connections` 列表和连接级动作；观察多实例租约、重复事件和滚动发布。
6. 运行稳定后归档旧 Dict 记录并保留备份；归档动作必须可重试且不删除连接表数据。
7. 回滚时先停用新连接并恢复旧前端；legacy 配置仍可运行，新连接配置保留在连接表中，不得覆盖旧 Agent 配置。

启动迁移文件使用当前平台的语义版本命名（`timestamp-version-description.js`），使已安装同版本实例的启动迁移协调器能够按迁移历史名称发现并执行新增表；迁移本身保持幂等，重复重启不会覆盖连接或凭证。

## Open Questions

无。数据源、唯一性、迁移冲突、路由兼容、多实例租约和删除语义均已确定。
