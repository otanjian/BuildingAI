# feishu-connection-management Specification

## Purpose
为管理员提供飞书连接实例的统一管理能力，使一个 Bowi AI 智能体可以安全、独立地关联多个飞书 App，并让每个 App 的生命周期、迁移状态和运行状态清晰可见。
## Requirements
### Requirement: The Feishu menu opens a paginated connection list

系统 SHALL 将“飞书机器人”菜单作为飞书连接列表入口，而不是直接打开某个智能体的单条配置表单。列表 SHALL 支持服务端分页、按连接名称/智能体/启用状态/运行状态筛选，并展示连接名称、关联智能体、脱敏 App ID、启用状态、运行状态、迁移状态、最近错误和更新时间。

#### Scenario: Administrator opens the Feishu menu

- **WHEN** 管理员点击“飞书机器人”菜单
- **THEN** 系统展示分页的飞书连接实例列表，并可区分同一智能体下的多条连接

#### Scenario: No connections exist

- **WHEN** 列表没有任何飞书连接
- **THEN** 系统展示空状态、配置说明和“新增连接”操作

#### Scenario: Administrator filters the list

- **WHEN** 管理员按连接名称、智能体或启用/运行状态筛选
- **THEN** 列表只展示符合筛选条件的连接，且筛选不会泄露任何密钥

### Requirement: A connection is an independently addressable resource

系统 SHALL 将每条飞书连接作为独立资源管理。每条连接 MUST 关联一个 Agent、拥有稳定且唯一的连接 ID、连接名称、飞书 App ID、飞书 App Secret、适用的 Agent 访问凭证、群聊 @ 策略和启用状态。新连接默认停用，保存配置不得隐式启用连接。

#### Scenario: Administrator creates a second App for one agent

- **WHEN** 管理员为已经存在飞书连接的智能体新增另一个合法飞书 App
- **THEN** 系统创建一条新的连接记录，不修改第一条连接，并在列表中同时展示两条连接

#### Scenario: Administrator edits one connection

- **WHEN** 管理员编辑某条连接并保存
- **THEN** 系统只更新该连接，其他连接的凭证、运行状态和启用状态保持不变

#### Scenario: Administrator edits a saved secret

- **WHEN** 管理员编辑连接但未填写 App Secret 或适用的 Agent 访问凭证
- **THEN** 系统保留原密钥；页面不得回显原密钥

### Requirement: App binding is unique and routing is unambiguous

系统 SHALL 保证一个规范化飞书 App ID 在当前系统中最多绑定一个连接。系统 MUST 拒绝将同一 App ID 绑定到其他连接，并返回不包含完整 App ID 或密钥的可理解冲突信息。一个 Agent 可以绑定多个不同 App ID，但一个 App 的消息 MUST 始终路由到唯一 Agent。

#### Scenario: Duplicate App ID is submitted concurrently

- **WHEN** 两个管理员或两个请求同时提交同一个未绑定的 App ID
- **THEN** 最多一个请求成功，其他请求收到冲突错误，系统中不存在两个有效绑定

#### Scenario: Same App ID is retained during edit

- **WHEN** 管理员编辑连接但保留该连接当前 App ID
- **THEN** 系统允许保存，不将该连接误判为重复绑定

### Requirement: Connection lifecycle actions are isolated and explicit

系统 SHALL 支持对单条连接执行测试、启用、停用和删除。启用、停用或删除一条连接 MUST NOT 改变同一 Agent 的其他连接。删除前系统 MUST 要求二次确认；删除后必须停止该连接的运行实例、取消其活动任务并清理或使其运行态失效。

#### Scenario: Administrator enables one connection

- **WHEN** 管理员对一条已测试且配置有效的停用连接执行启用
- **THEN** 系统只启动该连接，并刷新该行的启用和运行状态

#### Scenario: Administrator toggles one connection

- **WHEN** 管理员启用或停用列表中的一条连接
- **THEN** 系统只改变该连接的启用状态和运行实例，其他连接继续保持原状态

#### Scenario: Administrator deletes an enabled connection

- **WHEN** 管理员确认删除一条已启用连接
- **THEN** 系统阻止新的事件进入，停止其运行实例，取消活动任务，清理或失效连接级运行态，再删除配置；其他连接继续运行

#### Scenario: Credential test fails

- **WHEN** 管理员测试无效的飞书凭证
- **THEN** 系统返回测试失败原因，不启用连接，也不修改已保存配置

### Requirement: Runtime ownership is exclusive across service instances

系统 SHALL 确保同一启用连接在任一时刻最多由一个 API 实例持有运行租约并处理飞书长连接事件。实例失去租约、无法续租或连接被停用时 MUST 停止接收新事件并关闭本地长连接。

#### Scenario: Two API instances start the same connection

- **WHEN** 两个 API 实例同时尝试恢复同一个已启用连接
- **THEN** 只有一个实例获得运行租约并建立长连接，另一个实例不建立第二条长连接

#### Scenario: Runtime lease expires

- **WHEN** 当前实例无法续租连接
- **THEN** 系统关闭该实例的连接并允许其他实例重新获得租约，且不会继续处理新事件

### Requirement: Existing single-configuration deployments are migrated safely

系统 SHALL 兼容当前以 Agent ID 为配置键的飞书配置，并将每条旧配置识别为一条连接。迁移 MUST 幂等、保留原凭证和启用语义、保留历史会话兼容性，并对重复 App ID、格式错误和 Agent 不存在的记录提供可见状态；冲突或孤儿记录 MUST 强制停用，不能自动选择或覆盖。

#### Scenario: Existing configuration is first loaded

- **WHEN** 新版本首次读取有效的旧版按 Agent 保存配置
- **THEN** 系统将其导入或呈现为一条 legacy 连接，并保留该连接可编辑、可测试和可启停

#### Scenario: Legacy configurations contain duplicate App IDs

- **WHEN** 迁移预检发现多条旧配置绑定同一个 App ID
- **THEN** 系统不静默覆盖任何配置，将冲突记录标记为冲突并停用，同时向管理员展示可修复的迁移结果

#### Scenario: Migration runs more than once

- **WHEN** 服务重启或迁移命令重复执行
- **THEN** 系统不会为同一旧配置创建重复连接，也不会重复启动同一个有效 App

### Requirement: Agent deletion and unsupported-agent changes are safe

系统 MUST 不允许在仍存在飞书连接时直接删除被关联 Agent，或 MUST 先完成连接的安全停用和删除。若 Agent 不存在或不再是标准 Agent，其连接 MUST 自动停用并显示原因，不能继续接收消息。

#### Scenario: Administrator deletes an Agent with Feishu connections

- **WHEN** 管理员尝试删除仍被飞书连接引用的 Agent
- **THEN** 系统拒绝删除并提示先处理关联连接

#### Scenario: Agent becomes unsupported

- **WHEN** 连接关联的 Agent 不再满足飞书通道要求
- **THEN** 系统停用该连接、停止运行实例，并在列表中展示不可用原因

### Requirement: Secrets and connection-scoped runtime state remain protected

系统 MUST 不在列表、详情、成功响应、错误响应或日志中输出 App Secret、Agent 访问凭证或完整敏感请求内容。新保存的凭证 MUST 加密存储；事件幂等、会话上下文、活动连接和删除失效标记 MUST 按连接 ID 隔离，不能因同一 Agent 或相同 chat ID 发生串线。

#### Scenario: Two connections receive the same chat identifier

- **WHEN** 两个连接收到相同格式的飞书 chat ID
- **THEN** 系统分别维护两套会话和事件幂等状态，消息只进入各自绑定的 Agent 连接

#### Scenario: List response is returned

- **WHEN** 管理员请求连接列表或详情
- **THEN** 响应仅包含脱敏 App ID、是否已配置凭证等非敏感元数据，不包含任何 Secret 或访问凭证字段

#### Scenario: Deleted connection has an in-flight response

- **WHEN** 连接删除与一条正在生成的回复同时发生
- **THEN** 删除完成后该回复不得发送到飞书，且该连接的后续事件不得再触发 Agent 调用
