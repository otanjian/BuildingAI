## REMOVED Requirements

### Requirement: Extension cloned from ehcs-ai template

**Reason**: 20 个应用扩展目录全部删除，不再提供从 `ehcs-ai` 模板复制的扩展。
**Migration**: 仅 `extensions/ehcs-ai` 保留；如需新应用请基于 `ehcs-ai` 重新开发。

### Requirement: Per-app naming conventions

**Reason**: 不再存在多应用表前缀与 MCP 工具命名需求。
**Migration**: 仅 EHCS 使用 `ehcs-` 表前缀与 `ehcs_` MCP 工具命名。

### Requirement: Application entry URLs

**Reason**: `/apps/{appId}` 仅剩 `ehcs-ai` 一个入口。
**Migration**: `/apps/ehcs-ai` 保留，其余路由不再注册。
