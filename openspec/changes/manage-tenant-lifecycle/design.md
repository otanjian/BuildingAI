## Context

当前租户控制器仅支持查询当前用户可见租户、成员增改和管理员指定；租户实体已有唯一编码、状态、owner/admin 字段，但没有创建、生命周期更新、归档或成员删除接口。租户页面将改为“清单页 + 成员页”，现有 tenant_memberships 关系继续承载成员边界。

## Goals / Non-Goals

**Goals:**

- 让平台根用户可以创建并管理所有租户；租户管理员只能管理自己负责的租户成员。
- 让清单筛选在服务端执行，并返回稳定的成员计数和开通日期。
- 使用事务保证租户、管理员用户和成员关系的原子性。
- 使用 archived 作为删除语义，保护默认租户和已有业务数据。

**Non-Goals:**

- 不物理级联删除业务表，不删除全局用户。
- 不引入多管理员、审批流或新的角色模型。

## Decisions

1. **创建权限**：仅 `isRoot`
   平台管理员可创建租户、停用/启用租户和归档租户；租户管理员只管理成员。这样避免把跨租户生命周期权限下放。
2. **创建接口**：增加 `POST /consoleapi/tenant`，支持 `adminUserId`
   或内嵌新用户字段，服务端事务内创建租户及管理员 membership；唯一编码由数据库约束和友好错误共同保证。
3. **列表接口**：`GET /consoleapi/tenant` 接收 `keyword`、`status`、`page`、`pageSize`，返回
   `{items,total,page,pageSize}`；root 查询所有非 archived 租户，成员查询自己可访问租户。
4. **生命周期接口**：增加 `PATCH /consoleapi/tenant/:tenantId/status` 和
   `DELETE /consoleapi/tenant/:tenantId`。删除先检查默认租户标识及业务数据计数；可删除空租户时只更新为 archived。
5. **成员删除**：增加
   `DELETE /consoleapi/tenant/:tenantId/members/:membershipId`，删除 membership 关系；禁止删除唯一管理员，避免产生不可管理租户。
6. **前端路由**：租户列表行的“租户成员”进入 `/console/tenant/:tenantId/members`；列表页通过 query
   state 保留筛选；成员页复用现有添加表单和管理员/状态操作。
7. **用户筛选**：用户管理页增加所属租户下拉筛选。平台根用户可选择任意租户；非根用户只能使用当前已验证租户，服务端拒绝跨租户参数。

## Risks / Trade-offs

- [Risk]
  业务数据表很多，删除前的完整计数可能增加查询开销 → 以租户资源表的存在性检查为主，使用索引字段并在服务端统一封装。
- [Risk] archived 租户仍保留历史记录 → 所有普通列表、上下文解析和新资源创建入口统一排除 archived。
- [Risk]
  创建新管理员用户可能与全局用户名冲突 → 在事务开始前校验 username/email，并在唯一约束冲突时回滚整个创建。

## Migration Plan

无需新增表；部署 API 和前端后，现有租户继续使用 active 状态。默认租户通过既有迁移保护；回滚时保留数据，旧页面仍可读取现有租户和成员接口。
