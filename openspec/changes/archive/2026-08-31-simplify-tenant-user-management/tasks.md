## 1. Data model and migration

- [x] 1.1 Add/adjust tenant administrator and membership fields and indexes for the simplified two-role model.
- [x] 1.2 Add an idempotent migration that creates the default tenant, identifies 谭建, marks the user as platform admin, and backfills existing users and tenant-owned content.
- [x] 1.3 Add migration tests for repeat execution, unique default tenant, administrator membership, and content backfill statistics.

## 2. Tenant context and API

- [x] 2.1 Implement a single verified tenant-context service and use it for current-tenant selection and membership checks.
- [x] 2.2 Scope user listing and creation to authorized tenant administrators; create account and membership atomically and support existing-user membership creation.
- [x] 2.3 Implement direct administrator assignment and member status updates with audit events and cache invalidation.
- [x] 2.4 Apply tenant scope to tenant-owned list/detail/write paths and add cross-tenant negative tests.

## 3. Web administration

- [x] 3.1 Add a global tenant selector/default-tenant setting with tenant-aware query cache keys and safe switching behavior.
- [x] 3.2 Replace the tenant page with simplified tenant overview and member management; remove or hide project/resource/governance demo controls from the primary flow.
- [x] 3.3 Update user creation and user list views to show tenant membership context and route tenant membership changes through tenant APIs.

## 4. Verification

- [x] 4.1 Run database build, API typecheck/tests, client lint/tests, and OpenSpec validation.
- [x] 4.2 Rehearse the migration against a disposable database and verify default tenant ownership for existing agents, MCP records, and users.
- [x] 4.3 Perform browser verification for tenant switching, member creation, administrator assignment, and cross-tenant denial.
  - Verified in an authenticated Chrome session: tenant switching updated the page and member list; a temporary member was created in `default`; it was assigned as administrator and then restored to 谭建; an isolated temporary member login returned only `default`, while requesting `browser-b` returned HTTP 404. Temporary accounts, memberships, and tokens were removed after verification.

## 最终完成状态（2026-08-31）

- 实现与数据库迁移已完成；默认租户、谭建平台管理员/租户管理员、存量用户及租户业务数据归属已完成核对。
- 数据库迁移已应用且无待执行迁移；OpenSpec 校验、数据库/API/客户端验证均已完成。
- 恢复服务时发现并修复 `SystemModule` 未注册 `TenantMembership` 仓储导致 API 无法启动的问题，并增加启动依赖回归测试。
- 4.3 已完成：已在认证浏览器会话中完成租户切换、成员创建、管理员指定和跨租户拒绝验收，并清理所有临时验收数据。
- 已完成并归档；临时验收账号、成员关系和令牌均已清理。
