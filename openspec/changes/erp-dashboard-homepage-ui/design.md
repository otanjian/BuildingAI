## Context

`extensions/erp-healthy` 首页由 `dashboard/index.tsx` 编排，子组件 `dashboard-visuals.tsx`（ScoreHero、MetricCard、DimensionPanel、ScoreTrendPanel、GovernanceOverviewPanel）与 `rules-overview-table.tsx` 组成。数据来自 Console API：`getDashboardSummary`、`getDashboardTrend`、`getRulesOverview`、`getConfig`。

静态参考 `docs/ERP数据治理.html` 定义了玻璃拟态容器、靛紫主题、2:1 顶部栅格、三列维度卡、趋势柱图配色、规则表头操作区。现实现功能基本齐全，差异主要在视觉层级、文案与少量元数据展示。

## Goals / Non-Goals

**Goals:**

- 在 React + Tailwind + `@buildingai/ui` 内复刻参考稿布局与视觉，不引入新 UI 框架
- 复用现有 API 与检查流程；仅必要时增加只读字段（如评分 delta）由前端从 `trend` 计算
- 保持 `/apps/erp-healthy` 嵌入场景下滚动、响应式与暗色模式可读

**Non-Goals:**

- 不改 `docs/ERP数据治理.html` 文件本身
- 不新增后端表或迁移
- 不实现参考稿中无数据支撑的「AI 预测」趋势（除非后续 API 提供）

## Decisions

### 1. 组件重构策略：演进 `dashboard-visuals` 而非重写页面

**选择：** 在 `dashboard-visuals.tsx` 增加/改造展示组件（`DashboardShell`, `DashboardHeader`, `HealthScoreCard`, `DimensionModuleCard`, `TrendBarChart`, `GovernanceSummaryCard`），`index.tsx` 仅调整栅格与 props 传递。

**理由：** 现有 `ScoreHero`/`MetricCard` 逻辑可映射到参考稿区块，减少回归风险。

**备选：** 单文件内联 JSX — 拒绝，不利于对照 HTML 区块维护。

### 2. 样式实现：Tailwind 工具类 + 少量 CSS 变量

**选择：** 用 Tailwind 实现背景网格、backdrop-blur、渐变标题；环形分数用 SVG（与 HTML 一致）或保留现有实现并调整 stroke 渐变。

**理由：** 扩展已用 Tailwind；避免全局污染主应用。

**备选：** 复制 HTML `<style>` 到独立 css — 仅当 Tailwind 无法表达动画光晕时使用 `dashboard-page.css`。

### 3. 维度模块命名映射

**选择：** 展示层映射（不改 API enum）：

| API `dimension` | 参考稿展示名 |
|-----------------|-------------|
| `static`        | 财务数据     |
| `inventory`     | 业务伙伴     |
| `order`         | 供应链       |

占比 = `count / totalDimensionIssues`（total 为 0 时显示 0%）。

**理由：** 后端维度语义与参考稿业务命名不一致，产品要求以参考稿为准。

### 4. MCP 状态徽章

**选择：** 前端 `getConfig()` 读取 `mcpServerId`；若为空显示「MCP 未配置」。若已配置，调用现有 MCP 列表/健康检查接口（若有）或显示「MCP 已配置」；若扩展已有 bridge ping 则显示「已连接/未连接」。

**理由：** 避免阻塞首页加载；参考稿为展示态，不要求实时 ERP 握手。

**备选：** 每次加载 ping MCP — 可能慢，放二期。

### 5. 评分环比（较上次 +N）

**选择：** 从 `getDashboardTrend(10)` 最近两条 completed run 的 `score` 计算 `delta = latest - previous`；不足两条时不显示环比文案。

**理由：** 无需新 API。

### 6. 趋势图标题与柱色

**选择：** 标题「评分趋势」；柱色按分数阈值：&lt;60 红，60–79 黄，≥80 绿（与 HTML 示例一致）。

**理由：** 与参考稿视觉一致且不宣称「AI 预测」除非有数据。

### 7. 规则表头元数据

**选择：** 从 `rules.items` 聚合：`enabledCount`、`lastCheckAt`（各规则 `lastCheckedAt` 最大值格式化）。

**理由：** 数据已在 `getRulesOverview` 返回。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 维度显示名与规则「数据项」不一致 | 仅在维度卡使用映射表；表格仍用原始 dataItem |
| 玻璃拟态在旧浏览器性能差 | 降级为纯色卡片 `bg-card` |
| 暗色模式下对比度不足 | 为 dark: 变体单独定义 border/background |
| 大范围 class 改动影响检查协调器 | 不改 `useInspectionCoordinator` 与 table 行事件 |

## Migration Plan

1. 实现 UI 组件与 `index.tsx` 布局调整
2. `pnpm --filter erp-healthy build:web` 验证静态资源路径
3. 从 `/apps/erp-healthy` 手动验收对照 `docs/ERP数据治理.html`
4. 回滚：恢复 `dashboard/*` 文件即可，无 DB 变更

## Open Questions

- MCP 徽章是否必须真实 ping，还是「已配置」即可满足首期？（建议首期：已配置 / 未配置）
- 页头主标题用「ERP 智能数据治理」还是菜单名「ERP数据治理」？（建议：主标题用参考稿，菜单保持 ERP数据治理）
