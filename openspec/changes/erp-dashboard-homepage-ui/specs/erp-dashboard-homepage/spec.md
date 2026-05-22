## ADDED Requirements

### Requirement: Dashboard page layout matches reference mockup

The erp-healthy extension homepage SHALL render inside a glass-style container with indigo/violet gradient page background and grid overlay, matching the section order in `docs/ERP数据治理.html`: header, top health metrics (2:1 grid), three dimension modules, trend + governance overview (1:1 grid), rules table.

#### Scenario: User opens embedded dashboard

- **WHEN** user navigates to `/apps/erp-healthy` (or extension index route)
- **THEN** the page displays all five sections in the reference order without horizontal overflow on viewports ≥1280px

#### Scenario: Narrow viewport

- **WHEN** viewport width is below 1024px
- **THEN** multi-column grids stack vertically while remaining scrollable within the extension iframe

### Requirement: Dashboard header shows product title and actions

The header SHALL display a gradient icon, title text「ERP 智能数据治理」, subtitle「AI 驱动 · 实时质量监控」, an MCP status badge, and action buttons for AI chat, run history, approvals, and settings that preserve existing navigation behavior.

#### Scenario: MCP configured

- **WHEN** governance config includes a non-empty `mcpServerId`
- **THEN** the header shows a badge indicating MCP is configured (e.g.「MCP 已连接」or「MCP 已配置」)

#### Scenario: MCP not configured

- **WHEN** `mcpServerId` is empty or missing
- **THEN** the header shows a badge indicating MCP is not configured

#### Scenario: Header actions

- **WHEN** user clicks「AI 对话」
- **THEN** the platform embedded AI panel opens using the existing `openEmbeddedAiPanel` behavior

### Requirement: Health score card displays score and severity counts

The top-left health card SHALL show a circular score (0–100 or em dash when unknown), label「数据质量健康度」, severity pills for high/medium/low counts from `getDashboardSummary`, and optional status text derived from score thresholds.

#### Scenario: Score available

- **WHEN** dashboard summary returns a numeric score
- **THEN** the ring and numeric display show that score

#### Scenario: Score delta from history

- **WHEN** trend API returns at least two runs with numeric scores
- **THEN** the card shows change versus the previous run (e.g.「较上次 +2」or negative delta)

#### Scenario: Insufficient history

- **WHEN** fewer than two scored runs exist
- **THEN** delta text is omitted without error

### Requirement: Alert and approval metric cards

The top-right column SHALL show two cards aligned with the reference:「待修复高严重度」with high-severity count and hint, and「待审批修复」with `pendingApprovals` from summary.

#### Scenario: Summary loaded

- **WHEN** dashboard summary loads successfully
- **THEN** both cards display live counts from the API

### Requirement: Dimension module cards with mapped labels

Three module cards SHALL display mapped dimension names（财务数据 / 业务伙伴 / 供应链）, issue count per dimension, share percentage, and a progress bar whose width reflects share of total dimension issues.

#### Scenario: Dimension counts present

- **WHEN** summary includes `dimensionCounts` for static, inventory, and order
- **THEN** each card shows the correct count and percentage bar

#### Scenario: Zero total issues

- **WHEN** all dimension counts sum to zero
- **THEN** progress bars show 0% without division errors

### Requirement: Score trend chart with threshold colors

The trend section SHALL render a bar chart for up to 10 historical scores with bar colors: red if score &lt; 60, yellow if 60–79, green if ≥80, and title「评分趋势」.

#### Scenario: Trend data loaded

- **WHEN** `getDashboardTrend` returns scored runs
- **THEN** bars reflect each run’s score height and color band

#### Scenario: Empty trend

- **WHEN** no trend points exist
- **THEN** the chart area shows an empty state message without breaking layout

### Requirement: Governance overview list

The overview card SHALL list: latest quality score, high/medium/low issue counts, and enabled rules as「已开启 x / y」computed from rules overview.

#### Scenario: Rules overview available

- **WHEN** rules overview returns items with `enabled` flags
- **THEN** the enabled count matches the number of enabled rules and total rule count

### Requirement: Rules table section matches reference chrome

The rules section SHALL use reference-style table chrome: section title「检查规则与上次结果」, last check timestamp (max of rule last-checked times), enabled-count badge,「+ 新增规则」and gradient「开始 AI 检查」buttons, and existing table columns (data item, rule, severity, last check, result, toggle, actions).

#### Scenario: Start AI inspection

- **WHEN** user clicks「开始 AI 检查」with at least one enabled rule and no run in progress
- **THEN** the existing inspection session + embedded chat flow starts unchanged

#### Scenario: Rule CRUD

- **WHEN** user adds, edits, deletes, or toggles a rule
- **THEN** existing governance API calls and validations apply without regression

#### Scenario: View last result

- **WHEN** user activates a row result that supports detail navigation
- **THEN** the existing detail drawer or route behavior is preserved

### Requirement: Existing inspection coordinator behavior unchanged

Refactoring dashboard UI MUST NOT break automatic result persistence, in-progress row states, or refresh after inspection completes.

#### Scenario: Inspection in progress

- **WHEN** an AI inspection run is active
- **THEN** the table reflects in-progress/中断 states and disables duplicate start per current logic

#### Scenario: Inspection completes

- **WHEN** the inspection coordinator signals completion
- **THEN** summary, trend, and rules data reload as today
