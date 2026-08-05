## REMOVED Requirements

### Requirement: Per-application platform agent configuration

**Reason**: 20 个应用的平台智能体配置（`*-platform-agent.config.ts`）随扩展删除。
**Migration**: 仅 EHCS 平台智能体配置保留于 `extensions/ehcs-ai`。

### Requirement: Agent seeder on install

**Reason**: 20 个扩展不再安装，`PlatformAgentSeeder` 随扩展删除。
**Migration**: EHCS 的 `ehcs-platform-agent.seeder.ts` 保留。

### Requirement: MCP tools registered with agent update

**Reason**: 20 组应用 MCP 工具元数据不再注册。
**Migration**: `bowi-mcp` 六工具目录保留，仅服务 `ehcs-ai`。
