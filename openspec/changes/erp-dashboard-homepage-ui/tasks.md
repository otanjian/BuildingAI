## 1. Layout shell and theme

- [x] 1.1 Add `DashboardPageShell` (or equivalent) in `dashboard-visuals.tsx` with reference background, glass container, and section spacing from `docs/ERP数据治理.html`
- [x] 1.2 Refactor `dashboard/index.tsx` to use the shell and 2:1 / 1:1 / full-width grids matching the mockup order
- [x] 1.3 Verify responsive stacking at `<lg` and dark-mode contrast for shell borders/backgrounds

## 2. Header and MCP badge

- [x] 2.1 Implement `DashboardHeader` with gradient icon, title「ERP 智能数据治理」, subtitle, and existing action buttons
- [x] 2.2 Load `getConfig()` on mount and render MCP badge（已配置 / 未配置）
- [x] 2.3 Manual check: AI 对话、运行历史、审批、设置 links work from `/apps/erp-healthy`

## 3. Health and metric cards

- [x] 3.1 Restyle `ScoreHero` → `HealthScoreCard` with SVG ring gradient, severity pills (high/medium/low), and status text by score threshold
- [x] 3.2 Compute score delta from `trend` (last two numeric scores) and show/hide「较上次 ±N」
- [x] 3.3 Restyle right-column `MetricCard` pair to match alert/process cards in the reference HTML

## 4. Dimension modules

- [x] 4.1 Add `DIMENSION_DISPLAY` map (static→财务数据, inventory→业务伙伴, order→供应链) in `i18n/zh` or dashboard constants
- [x] 4.2 Implement `DimensionModuleCard` with count, share %, and colored progress bar per dimension
- [x] 4.3 Replace current `DimensionPanel` row in `index.tsx` with three module cards in a 3-column grid

## 5. Trend and governance overview

- [x] 5.1 Update `ScoreTrendPanel` bar colors by score thresholds (&lt;60 red, 60–79 yellow, ≥80 green) and title「评分趋势」
- [x] 5.2 Extend `GovernanceOverviewPanel` with「已开启 x / y」from rules overview enabled count
- [x] 5.3 Add empty states for trend and overview when API returns no data

## 6. Rules table chrome

- [x] 6.1 Restyle `RulesOverviewTable` header: glass section, last-check timestamp (max `lastCheckedAt`), enabled badge
- [x] 6.2 Style「+ 新增规则」and gradient「开始 AI 检查」buttons per reference; keep disabled/loading states
- [x] 6.3 Regression: rule CRUD, toggle, start inspection, double-click result detail, coordinator refresh

## 7. Verification

- [x] 7.1 Run `pnpm --filter erp-healthy check-types` and `pnpm --filter erp-healthy lint`
- [x] 7.2 Run `pnpm --filter erp-healthy build:web` and hard-refresh `/apps/erp-healthy`
- [x] 7.3 Side-by-side acceptance against `docs/ERP数据治理.html` (layout, typography, key labels)
