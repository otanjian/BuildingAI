## REMOVED Requirements

### Requirement: Registry defines twenty enterprise applications

**Reason**: 产品范围收窄，20 个企业 AI 自治应用全部移除，仅保留 EHCS 数据健康治理。
**Migration**: 注册表文件 `docs/enterprise-ai-apps-registry.json` 已随本变更删除；EHCS 使用 `extensions/extensions.json` 中 `ehcs-ai` 条目。

### Requirement: Extensions manifest registration

**Reason**: 20 个应用不再提供扩展，无需在 `extensions/extensions.json` 注册。
**Migration**: `extensions/extensions.json` 仅保留 `ehcs-ai`。

### Requirement: Documentation cross-links

**Reason**: 关联文档（registry、PRD/DB）随应用一并移除。
**Migration**: 无替代文档；EHCS 文档保留在 `extensions/ehcs-ai/README.md`。
