## Why

`extensions/erp-healthy` 首页已有数据质量看板与 AI 检查能力，但视觉与信息架构与产品确认的静态稿 `docs/ERP数据治理.html` 不一致，影响演示一致性与业务方验收。需要在不破坏现有检查/规则/审批流程的前提下，将首页布局与样式对齐参考稿，并补齐少量展示能力（如 MCP 连接状态、评分环比、治理概览统计项）。

## Why now

应用已重命名为 **ERP数据治理**（`erp-healthy`），首页是主入口；对齐参考稿可降低沟通成本，并为后续功能迭代提供稳定 UI 基线。

## Non-goals

- 不重构后端规则引擎、检查协调器或 MCP 调用协议
- 不新增参考稿中未提及的治理流程（如批量导出、自定义报表）
- 不将 HTML 中的示例数据硬编码为生产默认值
- 不修改主应用 `/apps` 壳层与右侧 AI 侧栏实现

## What Changes

- 首页整体容器：玻璃拟态卡片、靛紫渐变背景与网格光晕（Tailwind/CSS，对齐 `ERP数据治理.html`）
- 页头：标题「ERP 智能数据治理」、副标题「AI 驱动 · 实时质量监控」、**MCP 已连接/未连接** 状态徽章；保留 AI 对话 / 运行历史 / 审批 / 设置入口
- 顶部区（2:1 栅格）：左侧环形健康度 + 高/中/低标签；右侧「待修复高严重度」「待审批修复」双卡（样式对齐参考稿）
- 三大维度模块：展示名称与进度条样式对齐参考稿（财务数据 / 业务伙伴 / 供应链），数据仍来自现有 `dimensionCounts`（static / inventory / order 映射）
- 趋势与概览：柱状趋势配色（红/黄/绿分段）、治理概览列表含「已开启规则 x / y」
- 规则表格区：表头区样式、上次检查时间、已开启数量徽章、「+ 新增规则」「开始 AI 检查」按钮样式对齐参考稿；保留现有 CRUD、开关、双击详情
- **补充（参考稿有、现网弱/无）**：
  - 健康度状态文案（如「需关注」）及较上次评分变化（有历史数据时显示 delta，无则隐藏）
  - MCP 连接状态探测（基于设置中的 `mcpServerId` 或轻量 ping，失败显示未连接）
  - 趋势图标题标注为历史评分（非 mock「AI 预测」文案，除非后端提供预测数据）

## Capabilities

### New Capabilities

- `erp-dashboard-homepage`: ERP 数据治理扩展首页的布局、视觉规范、数据展示与参考稿对齐的交互要求

### Modified Capabilities

（无既有 OpenSpec spec）

## Impact

- `extensions/erp-healthy/src/web/pages/dashboard/`（`index.tsx`, `dashboard-visuals.tsx`, `rules-overview-table.tsx`）
- 可能新增 `dashboard-theme.css` 或局部 Tailwind 工具类
- 只读扩展：`getDashboardSummary`, `getDashboardTrend`, `getRulesOverview`, `getConfig`（MCP 状态）
- 文档：`docs/ERP数据治理.html` 作为 UI 验收基准（只读参考）
