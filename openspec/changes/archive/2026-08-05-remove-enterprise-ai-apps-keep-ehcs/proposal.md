## Why

产品范围收窄：仓库中除 EHCS 数据健康治理（`extensions/ehcs-ai`）之外的 20 个企业 AI 自治应用不再需要，需要从代码库、注册表与文档中彻底移除，避免无用代码维护成本与启动时误加载。

## What Changes

- **BREAKING** 删除 `extensions/` 下除 `ehcs-ai` 外的 20 个 AI 应用扩展目录（`inv-opt-ai`、`proc-audit-ai`、`ar-risk-ai`、`ap-opt-ai`、`mfg-var-ai`、`forecast-ai`、`mdm-quality-ai`、`asset-life-ai`、`tax-compliance-ai`、`otif-ai`、`quality-rca-ai`、`hr-compliance-ai`、`project-health-ai`、`energy-carbon-ai`、`contract-ai`、`channel-inv-ai`、`budget-control-ai`、`service-sla-ai`、`fx-risk-ai`、`esg-report-ai`）。
- **BREAKING** `extensions/extensions.json` 注册表仅保留 `ehcs-ai`。
- **BREAKING** 删除 `packages/@buildingai/constants` 中针对这 20 个应用的常量：`ENTERPRISE_BOWI_APP_SCOPES`（bowi-app-scopes.ts）、`ENTERPRISE_DASHBOARD_BY_APP_ID`（enterprise-dashboard.constant.ts），并清理 bowi-mcp.constant.ts 中对多应用的描述。
- `packages/client/src/lib/extension-internal-agent-apps.ts` 仅保留 `ehcs-ai`。
- 删除 `scripts/enterprise-ai-apps/` 生成/维护脚本目录。
- 删除 `openspec/specs/enterprise-ai-apps-*` 与归档 change `2026-08-02-enterprise-ai-apps-scaffold`。
- 同步清理 `pnpm-lock.yaml` 中已删除扩展的依赖项。

## Capabilities

### New Capabilities

<!-- 无新增能力；本变更以删除为主 -->

### Modified Capabilities

- `enterprise-ai-apps-registry`: 移除 20 个企业 AI 应用注册，仅保留 ehcs-ai（spec 文件删除）
- `enterprise-ai-apps-extension-scaffold`: 移除 20 个应用扩展脚手架（spec 文件删除）
- `enterprise-ai-apps-platform-agent`: 移除 20 个平台智能体配置（spec 文件删除）
- `enterprise-ai-apps-rules-catalog`: 移除 20 套规则目录（spec 文件删除）
- `enterprise-ai-apps-demo-seed`: 移除 20 套演示数据种子（spec 文件删除）

## Impact

- **代码**：`extensions/`（约 20 个目录）、`scripts/enterprise-ai-apps/`、`packages/@buildingai/constants/src/shared/{bowi-app-scopes,enterprise-dashboard.constant,bowi-mcp.constant}.ts`、`packages/client/src/lib/extension-internal-agent-apps.ts`。
- **数据库**：不再创建 20 个 PostgreSQL schema（`inv_opt_ai` 等）；已存在的数据库数据不受迁移影响。
- **依赖**：`pnpm-lock.yaml` 更新；EHCS 及其运行所需的平台核心能力（Agent/聊天/MCP/`modules/ai`）全部保留。
- **文档**：`openspec/specs/enterprise-ai-apps-*` 删除，归档 change 移除。

## Non-goals

- 不删除 EHCS 数据健康治理（`extensions/ehcs-ai`）及其依赖的平台核心 AI 能力。
- 不修改数据库已落库数据，不新增迁移回滚脚本。
