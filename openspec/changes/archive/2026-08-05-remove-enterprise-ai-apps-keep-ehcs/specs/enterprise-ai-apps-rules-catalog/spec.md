## REMOVED Requirements

### Requirement: Minimum thirty rules per application

**Reason**: 20 套规则目录种子随扩展删除。
**Migration**: 仅 EHCS 规则目录保留（`extensions/ehcs-ai`）。

### Requirement: Domain-specific rule content

**Reason**: 各应用领域规则不再需要，`validate-catalogs.mjs` 校验脚本随 `scripts/enterprise-ai-apps/` 删除。
**Migration**: EHCS 规则目录按既有方式维护。

### Requirement: Rules catalog seeder behavior

**Reason**: 各扩展 `seed:rules` 脚本随扩展删除。
**Migration**: `pnpm --filter ehcs-ai seed:rules` 保留。

### Requirement: Rule field schema

**Reason**: 多应用规则字段统一 schema 仅 EHCS 需要，规范并入 EHCS 既有 spec。
**Migration**: 参考 `openspec/specs/ehcs-ai-rules-api/spec.md`。
