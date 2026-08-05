## REMOVED Requirements

### Requirement: Sample anomalies on empty database

**Reason**: 20 套演示异常种子随扩展删除。
**Migration**: 仅 EHCS 演示数据种子保留。

### Requirement: Sample data idempotency

**Reason**: 20 个应用的 `AiDataSeeder` 不再需要。
**Migration**: EHCS 数据种子保留其幂等行为。

### Requirement: Dashboard demonstrability

**Reason**: 20 套 dashboard 预设与演示配置随 `scripts/enterprise-ai-apps/` 删除。
**Migration**: EHCS dashboard 保留，模板能力由 `@buildingai/constants` 中 EHCS 配置提供。
