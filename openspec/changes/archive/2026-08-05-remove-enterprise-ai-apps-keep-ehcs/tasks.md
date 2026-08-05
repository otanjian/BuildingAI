## 1. 删除扩展目录与注册

- [x] 1.1 删除 `extensions/` 下除 `ehcs-ai` 外的 20 个 AI 应用扩展目录
- [x] 1.2 更新 `extensions/extensions.json`，`applications` 仅保留 `ehcs-ai`

## 2. 清理平台共享常量

- [x] 2.1 `packages/@buildingai/constants/src/shared/bowi-app-scopes.ts`：删除 `ENTERPRISE_BOWI_APP_SCOPES`，`BOWI_APP_SCOPES` 仅含 EHCS
- [x] 2.2 `packages/@buildingai/constants/src/shared/enterprise-dashboard.constant.ts`：删除 20 个应用的 dashboard 配置条目
- [x] 2.3 `packages/@buildingai/constants/src/shared/bowi-mcp.constant.ts`：去掉对 `inv-opt-ai` 等应用的示例文案引用（保留 6 个通用 bowi_* 工具）
- [x] 2.4 `packages/client/src/lib/extension-internal-agent-apps.ts`：集合仅保留 `ehcs-ai`

## 3. 删除生成脚本与 OpenSpec artifacts

- [x] 3.1 删除 `scripts/enterprise-ai-apps/` 目录
- [x] 3.2 删除 `openspec/specs/enterprise-ai-apps-*` 5 个 spec 目录
- [x] 3.3 删除归档 change `openspec/changes/archive/2026-08-02-enterprise-ai-apps-scaffold/`

## 4. 依赖与验证

- [x] 4.1 运行 `pnpm install` 更新 `pnpm-lock.yaml`（修剪已删除 workspace 成员）
- [x] 4.2 全仓 `rg` 复查：20 个应用标识符无残留引用（排除 logs/public/dist/build）
- [x] 4.3 运行 `pnpm typecheck` 与 `pnpm lint` 验证平台与 EHCS 可编译
- [x] 4.4 构建 `ehcs-ai`（`pnpm --filter ehcs-ai build:publish`）确认不受影响
