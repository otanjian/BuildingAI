## Purpose

为平台管理员和租户管理员提供一个可筛选、可审计且不会误删业务数据的租户生命周期管理入口，并让租户成员边界与全局用户账号保持清晰分离。

## ADDED Requirements

### Requirement: Tenant list and filtering

系统 SHALL 在租户管理清单中展示租户编码、租户名称、当前状态、成员数量和开通日期，并支持按编码或名称模糊筛选及按状态筛选。

#### Scenario: Filter tenant list

- **WHEN** 管理员输入租户编码或名称关键词，或选择状态筛选条件
- **THEN** 系统只返回同时满足筛选条件的租户，并返回每个租户的成员数量和开通日期

#### Scenario: Empty filter result

- **WHEN** 筛选条件没有匹配租户
- **THEN** 系统返回空清单并显示无匹配结果，不报错

### Requirement: Create tenant

系统 SHALL 允许平台管理员创建租户，租户编码必须唯一，创建时必须指定一个现有用户或创建一个新用户作为该租户唯一管理员。

#### Scenario: Create tenant with existing administrator

- **WHEN** 平台管理员提交合法且未占用的租户编码，并选择一个用户作为管理员
- **THEN** 系统创建 active 租户和 active admin 成员关系，并在清单中显示该租户

#### Scenario: Duplicate tenant code

- **WHEN** 平台管理员提交已存在的租户编码
- **THEN** 系统拒绝创建并提示编码已存在，不产生部分租户或成员数据

### Requirement: Tenant status and deletion

系统 SHALL 允许有权限的管理员启用或停用租户；系统 SHALL 禁止删除默认租户，且有业务数据的租户不得被物理删除，只能归档。

#### Scenario: Suspend tenant

- **WHEN** 平台管理员将 active 租户更新为 suspended
- **THEN** 租户状态更新，租户不再出现在普通用户可切换的 active 租户列表中

#### Scenario: Enable tenant

- **WHEN** 平台管理员将 suspended 租户更新为 active
- **THEN** 租户恢复为可访问状态，并可由其有效成员切换进入

#### Scenario: Delete protected tenant

- **WHEN** 管理员尝试删除默认租户或包含业务数据的租户
- **THEN** 系统拒绝删除并说明保护原因，原租户和业务数据保持不变

#### Scenario: Archive empty tenant

- **WHEN** 管理员删除没有业务数据的非默认租户
- **THEN** 系统将租户标记为 archived，从 active 清单和切换列表中隐藏，并保留审计记录

### Requirement: Tenant member management

系统 SHALL 提供租户成员页面，允许有权限的管理员添加成员或移除成员；移除成员不得删除全局用户账号。

#### Scenario: Add member

- **WHEN** 租户管理员提交已有用户或合法的新用户信息
- **THEN** 系统创建 active 成员关系，并更新清单中的成员数量

#### Scenario: Remove member

- **WHEN** 租户管理员移除一个非唯一管理员的成员
- **THEN** 系统解除该成员与租户的关系，全局用户仍可登录并保留其其他租户成员关系

#### Scenario: Remove sole administrator

- **WHEN** 管理员尝试移除当前租户唯一管理员
- **THEN** 系统拒绝操作并要求先指定其他有效成员为管理员

### Requirement: User tenant filtering

系统 SHALL 在用户管理提供所属租户筛选框；平台管理员可按租户查看用户，租户管理员只能查看当前租户成员，服务端必须校验租户边界。

#### Scenario: Platform administrator filters users by tenant

- **WHEN** 平台管理员选择一个租户
- **THEN** 用户清单只返回该租户的有效成员

#### Scenario: Tenant administrator cannot cross-filter users

- **WHEN** 租户管理员提交与当前租户不同的租户筛选参数
- **THEN** 系统拒绝请求，不泄露其他租户的用户数据
