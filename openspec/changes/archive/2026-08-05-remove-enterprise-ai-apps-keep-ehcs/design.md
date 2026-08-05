## Context

BuildingAI monorepo 当前包含 21 个 `*-ai` 扩展，其中 `ehcs-ai` 是 EHCS 数据健康治理产品。其余 20 个扩展（`inv-opt-ai`…`esg-report-ai`）由 `2026-08-02-enterprise-ai-apps-scaffold` 批量脚手架生成，注册于 `extensions/extensions.json`，并有多处平台侧共享常量与生成脚本引用。产品决定：仅保留 EHCS 数据健康治理，其余 20 个 AI 应用及其配套代码全部移除。

EHCS 是运行在 BuildingAI 平台上的自治应用：依赖平台智能体（Agent）、聊天、MCP、`packages/api/src/modules/ai` 等核心能力，这些属于平台基础设施，**不在删除范围**。

## Goals / Non-Goals

**Goals:**
- 删除 20 个企业 AI 应用扩展目录及 `extensions.json` 注册。
- 清理平台共享常量中的 20 应用条目，仅保留 EHCS。
- 删除 `scripts/enterprise-ai-apps/` 与 `openspec` 中 `enterprise-ai-apps-*` 相关 artifact。
- 更新 `pnpm-lock.yaml`，保持 workspace 可安装、可构建。
- EHCS 数据健康治理功能不受影响、正常运行。

**Non-Goals:**
- 不删除平台核心 AI 能力（Agent/聊天/MCP/`modules/ai`/`@buildingai/ai-*`）。
- 不删除 `ehcs-ai` 扩展及其种子、迁移、MCP 工具。
- 不修改数据库已落库数据，不做数据迁移。

## Decisions

### 1. 直接删除扩展目录，而非禁用
在 `extensions.json` 中 `enabled=false` 虽能让平台不加载，但代码、种子、脚本仍会残留并增加维护负担。产品已明确不需要，故物理删除目录 + 注册条目。→ 替代方案（仅禁用）被否决。

### 2. 共享常量采用"只留 EHCS"策略
- `bowi-app-scopes.ts`：移除 `ENTERPRISE_BOWI_APP_SCOPES` 数组，`BOWI_APP_SCOPES` 仅含 `EHCS_BOWI_APP_SCOPE`。
- `enterprise-dashboard.constant.ts`：移除 `ENTERPRISE_DASHBOARD_BY_APP_ID` 中 20 应用条目（保留 EHCS 对应 dashboard 模板能力，若 EHCS 使用）。
- `bowi-mcp.constant.ts`：工具目录（6 个 bowi_* 工具）为通用能力，保留；仅调整示例文案，去掉对 `inv-opt-ai` 的引用。
- `extension-internal-agent-apps.ts`：`Set` 仅保留 `"ehcs-ai"`。

### 3. 删除生成脚本与文档
`scripts/enterprise-ai-apps/` 全部为 20 应用服务（scaffold/种子/品牌同步），EHCS 不依赖，整目录删除。`openspec/specs/enterprise-ai-apps-*` 5 个 spec 与归档 change `2026-08-02-enterprise-ai-apps-scaffold` 一并删除（git 历史保留可回溯）。

### 4. 锁文件与依赖
20 个扩展是 pnpm workspace 成员（`pnpm-workspace.yaml` 的 `extensions/*`）。删除目录后执行 `pnpm install` 重新生成 `pnpm-lock.yaml`，移除孤立 workspace 引用。

## Risks / Trade-offs

- [误删 EHCS 依赖的共享常量] → 删除前通过 `rg` 全仓搜索确认 EHCS 与平台核心代码对 `ENTERPRISE_*` 常量的引用均为零；删除后执行类型检查与构建验证。
- [`extension-internal-agent-apps.ts` 被其他模块引用] → 保留导出函数签名不变，仅缩短集合内容。
- [pnpm-lock.yaml 残留孤儿条目] → `pnpm install` 自动修剪；随后 `git status` 复查。
- [已部署数据库中存在 20 个 schema 数据] → 非目标，不迁移不清理；代码不再读写这些 schema。

## Migration Plan

1. 删除 20 个扩展目录与 `extensions.json` 条目。
2. 清理共享常量与前端集合。
3. 删除 `scripts/enterprise-ai-apps/` 与 openspec artifacts。
4. `pnpm install` 更新锁文件。
5. 运行 `pnpm typecheck` / `pnpm lint` / EHCS 构建验证。
6. 回滚：git revert 本 change 提交即可完整恢复。

## Open Questions

无。
