## Purpose

为用户提供一个清晰、可控且安全的长期记忆管理入口，使用户能够查看并维护会影响后续 AI 对话的个人信息。

## ADDED Requirements

### Requirement: Long-term memory menu entry

系统 SHALL 在登录用户可见的设置导航中提供“我的长期记忆”菜单项，并在点击后打开独立的长期记忆管理页面。

#### Scenario: Open memory management page

- **WHEN** 登录用户从设置导航点击“我的长期记忆”
- **THEN** 页面显示该用户的长期记忆列表及新增记忆入口

#### Scenario: Unauthenticated access

- **WHEN** 未登录用户尝试访问长期记忆管理页面或接口
- **THEN** 系统拒绝访问并返回未授权结果

### Requirement: List personal memories

系统 SHALL 只返回当前登录用户的有效全局长期记忆，并支持按更新时间倒序展示；列表为空时 SHALL 显示可理解的空状态。

#### Scenario: List memories

- **WHEN** 用户打开长期记忆管理页面
- **THEN** 页面展示属于该用户且仍有效的记忆内容、分类和更新时间

#### Scenario: Cross-user isolation

- **WHEN** 用户请求另一个用户的记忆 ID 或尝试通过参数改变 userId
- **THEN** 系统不得返回或修改另一用户的记忆，并返回资源不存在或无权访问

### Requirement: Create a memory manually

系统 SHALL 允许用户手动新增一条全局长期记忆，记忆内容不能为空且长度不得超过产品定义上限；分类 SHALL 使用受支持的分类值。

#### Scenario: Create valid memory

- **WHEN** 用户提交有效的记忆内容和分类
- **THEN** 系统创建属于当前用户的有效记忆并刷新列表

#### Scenario: Reject invalid memory

- **WHEN** 用户提交空白内容、超长内容或非法分类
- **THEN** 系统拒绝保存并返回字段级校验错误

#### Scenario: Duplicate memory

- **WHEN** 用户提交与其已有有效记忆规范化后相同的内容
- **THEN** 系统不得创建重复记录，并向客户端返回可处理的重复提示或现有记录

### Requirement: Edit a memory

系统 SHALL 允许用户编辑自己拥有的有效全局长期记忆内容和分类，并更新修改时间。

#### Scenario: Edit own memory

- **WHEN** 用户提交自己记忆的有效修改
- **THEN** 系统保存修改并在后续列表和对话上下文中使用新内容

#### Scenario: Edit missing or unauthorized memory

- **WHEN** 用户编辑不存在、已停用或不属于自己的记忆
- **THEN** 系统返回资源不存在或无权访问，且不修改任何数据

### Requirement: Delete and clear memories

系统 SHALL 支持删除单条记忆和清空当前用户全部全局记忆；删除 SHALL 为软删除或等价的不可用状态，且删除后不得继续注入对话提示词。

#### Scenario: Delete one memory

- **WHEN** 用户确认删除一条自己的记忆
- **THEN** 该记忆从列表移除，并不再被后续回答引用

#### Scenario: Clear all memories

- **WHEN** 用户确认清空全部长期记忆
- **THEN** 当前用户所有有效全局记忆被停用，列表显示为空

#### Scenario: Cancel destructive action

- **WHEN** 用户关闭删除或清空确认弹窗
- **THEN** 系统不修改任何记忆

### Requirement: Memory management API contract

系统 SHALL 提供个人记忆管理 API，至少包括列表、创建、更新、单条删除和清空操作；API 不得接受客户端提供的 userId 作为授权依据。

#### Scenario: API update authorization

- **WHEN** 客户端调用更新或删除接口
- **THEN** 服务端使用认证上下文中的用户 ID 与记忆所有者同时校验后才执行操作

#### Scenario: API response safety

- **WHEN** API 返回记忆数据
- **THEN** 响应只包含管理页面所需字段，不返回内部凭据、完整会话内容或其他用户信息

### Requirement: Usable and accessible interface

页面 SHALL 支持加载中、保存中、失败、空列表和移动端布局状态，并为新增、编辑、删除、清空控件提供可访问名称。

#### Scenario: Mutation feedback

- **WHEN** 新增、编辑或删除请求正在执行
- **THEN** 对应控件显示进行中状态并防止重复提交，请求结束后显示成功或失败反馈

#### Scenario: Mobile layout

- **WHEN** 用户在窄屏设备打开页面
- **THEN** 列表、编辑表单和操作按钮保持可读且不需要横向滚动
