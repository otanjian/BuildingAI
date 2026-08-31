## Purpose

以最小且一致的模型实现租户隔离：用户是全局账号，租户成员关系决定可访问租户，租户业务内容按已验证的 tenantId 隔离。

## ADDED Requirements

### Requirement: Maintain a default tenant and administrator

系统 SHALL 幂等创建 code 为 `default` 的 active 默认租户，并将唯一匹配的“谭建”用户设置为该租户管理员和平台管理员；现有内容 SHALL 在可确定时归入默认租户。

#### Scenario: Re-run the default tenant migration

- **WHEN** 默认租户初始化重复执行
- **THEN** 系统不创建重复租户、不重复成员关系，并确保当前存量业务记录仍统一归属于默认租户

#### Scenario: Backfill legacy content

- **WHEN** 现有智能体、知识库、对话、MCP、凭证或其他租户业务记录没有 tenantId
- **THEN** 系统将其归入默认租户并记录迁移统计；平台公共记录不被伪造为租户数据

### Requirement: Represent user access through tenant membership

系统 SHALL 将 User 作为全局账号，将 TenantMembership 作为用户与租户的访问关系；同一用户 MAY 加入多个租户。用户是否可访问租户 SHALL 只由 active、未过期的成员关系和租户状态决定。

#### Scenario: List accessible tenants

- **WHEN** 用户请求可访问租户列表
- **THEN** 返回其 active membership 对应的 active 租户，并标识当前管理员身份

#### Scenario: Deny an inactive membership

- **WHEN** 用户选择 suspended、revoked 或 expired 的成员关系
- **THEN** 请求被拒绝且不返回该租户内容

### Requirement: Enforce a single tenant administrator

系统 SHALL 在租户上记录一名当前管理员用户。管理员用户 SHALL 是该租户的 active 成员；管理员可以直接将另一名已加入用户设置为管理员，无需额外审批流程。

#### Scenario: Assign a tenant administrator

- **WHEN** 当前租户管理员指定一名已加入用户
- **THEN** 租户管理员字段更新，新管理员可管理该租户成员，旧管理员保留为普通成员

### Requirement: Create users within an authorized tenant

系统 SHALL 支持租户管理员创建全局用户并同时建立租户成员关系；管理员可选择的 tenantId SHALL 仅限其作为管理员的 active 租户。

#### Scenario: Create a tenant member

- **WHEN** 租户管理员提交新用户和一个可管理租户
- **THEN** 系统在同一事务中创建账号和 active 成员关系，默认身份为普通成员

#### Scenario: Reject an unauthorized tenant assignment

- **WHEN** 管理员提交其无权管理的 tenantId
- **THEN** 系统拒绝整个操作且不创建孤立用户或成员关系

### Requirement: Resolve and enforce current tenant context

系统 SHALL 从已验证的成员关系解析当前租户；客户端提供的 tenantId 只能选择上下文，不能授予权限。租户业务列表、详情、搜索、写入、更新、删除、执行和异步任务 SHALL 使用该上下文过滤。

#### Scenario: Switch tenant

- **WHEN** 多租户用户选择自己所属的另一个 active 租户
- **THEN** 后续请求使用新租户上下文，内容和管理员操作范围随之切换

#### Scenario: Prevent cross-tenant access

- **WHEN** 用户在租户 A 请求租户 B 的业务资源
- **THEN** 系统返回安全的 not-found/forbidden，不泄露租户 B 元数据且不发生状态变更

### Requirement: Separate global account state from membership state

系统 SHALL 将 User.status 用于全局登录状态，将 TenantMembership.status 用于单租户访问状态。全局禁用 SHALL 阻止所有租户登录；暂停一个成员 SHALL 不影响该用户在其他租户的 active membership。

#### Scenario: Suspend one tenant membership

- **WHEN** 用户在租户 A 的成员关系被暂停且其在租户 B 仍为 active
- **THEN** 用户不能访问租户 A，但仍可登录并访问租户 B

#### Scenario: Disable a global account

- **WHEN** 用户的全局 User.status 被设置为 disabled
- **THEN** 用户不能登录，也不能访问任何租户，即使仍存在 active 成员关系

### Requirement: Provide safe tenant-aware administration UI

系统 SHALL 提供可发现的租户选择器和租户成员管理界面。全局用户管理 SHALL 展示账号信息和租户摘要；租户成员管理 SHALL 展示当前租户成员、状态、管理员标识和新增/移除操作。页面不得要求管理员输入任意资源 UUID 才能完成常规成员管理。

#### Scenario: Manage members in the selected tenant

- **WHEN** 管理员切换当前租户并打开成员管理
- **THEN** 页面只展示所选租户成员，并提供新增成员、暂停成员和指定管理员操作
