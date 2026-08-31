## Why

当前用户、Agent、数据集、会话和工具资源主要按创建者或全局 ID 管理，缺少企业租户、组织和资源级授权边界。要让平台承载多个企业并支持协作、离职回收和审计，必须先建立统一的租户上下文与授权模型。

## What Changes

- 引入租户、组织/部门、项目和成员关系模型。
- 为 Agent、数据集、会话、自动化、凭据和计费资源建立强制租户归属；模型目录、菜单和经审核的系统工具等平台资源明确标记为全局资源。
- 用 RBAC + ABAC 支持资源级 `read/create/update/delete/publish/execute/approve/export` 权限。
- 在 API、检索和工具执行服务层统一解析并校验租户上下文，拒绝客户端伪造租户 ID。
- 支持成员邀请、角色变更、禁用、过期和权限缓存即时失效。
- 为存量单租户数据提供可审计的默认租户映射、回填和兼容读路径。
- 提供租户管理员可在控制台完成租户切换、成员/角色管理和项目授权，并能看到授权失败原因。
- 为公开 Agent/API key、渠道和异步服务请求定义服务端租户解析，不接受客户端自报租户。
- 明确现有系统管理员/平台控制台与新租户控制台的边界，平台管理员不得被误当作普通租户成员。

## Capabilities

### New Capabilities

- `enterprise-tenant-and-authorization`: 提供多租户、组织成员、项目作用域和资源级授权。

### Modified Capabilities

<!-- None. Existing capabilities remain compatible; this change adds the enterprise boundary. -->

## Impact

- 影响 `packages/@buildingai/db` 核心实体、TypeORM migrations、`packages/api` 认证/权限守卫和所有资源查询服务。
- 影响 Agent、Dataset、Conversation、Automation、MCP、Credential、Usage/Audit API 的输入上下文和错误语义。
- 需要一次性存量数据盘点、租户映射和回填，部署时采用兼容迁移。
- 需要新增企业控制台页面和浏览器验收数据集；API、异步任务和公开入口也必须复用同一租户上下文。

## Non-Goals

- 本 change 不实现 OIDC/SAML/SCIM/MFA；企业身份接入由 `enterprise-iam-and-data-governance` 负责。
- 本 change 不实现 Agent 发布审批、Tool Gateway 或 RAG 索引重构，只提供它们依赖的租户授权底座。

## Dependencies and Boundary

- `enterprise-secret-and-credential-security`、`tool-gateway-and-egress-policy`、`tenant-aware-rag-and-vector-index`、`audit-observability-and-cost-governance` 和 `enterprise-iam-and-data-governance` 依赖本 change 提供的租户上下文与资源授权。
- 本 change 必须覆盖 HTTP、异步 Worker、公开 Agent/API key、渠道和内部服务入口；不能只保护控制台路由。
- 平台级系统资源保留全局作用域；任何将全局资源绑定到租户资源的操作仍需经过显式兼容和授权规则。
