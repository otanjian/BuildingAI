# ehcs-ai-dashboard-ui Specification

## Purpose

Dashboard and global EHCS layout: metrics cockpit, charts, tables, top navigation, and agent dock entry. Aligned with `docs/PRD-EHCS-AI.md` V1.2 dashboard layout (not the legacy 70/30 split in `docs/UI-EHCS-AI.html`).

## Requirements

### Requirement: Full-width dashboard cockpit

The dashboard SHALL render a six-KPI row, chart grid (14-day anomaly trend, risk donut, domain bars, top rules, status pie, batch stack, repair trend), and two data tables (latest anomalies, recent check batches) across the main content area without a permanent right chat column.

#### Scenario: Dashboard load

- **WHEN** user opens `/extension/ehcs-ai/dashboard` or `/apps/ehcs-ai/dashboard`
- **THEN** KPI cards, charts, and tables are visible from `GET /ehcs-ai/console/dashboard/overview`

### Requirement: Top navigation

The extension SHALL use a top bar with links to dashboard, rules, anomalies, and settings (not an in-extension dark sidebar per UI prototype).

#### Scenario: Navigate to rules

- **WHEN** user clicks 检查规则 in top nav
- **THEN** rules page loads within the extension SPA

### Requirement: No table-header batch button

The latest anomalies card SHALL NOT include an「AI 自动检查」button in the table header.

#### Scenario: Dashboard anomalies card

- **WHEN** user views the latest anomalies table
- **THEN** only the section title and optional drill-down link are shown in the card header (no batch trigger button there)

### Requirement: Top bar agent toggle

The extension SHALL expose a 🤖 button at the right end of the top bar to open and close the agent dock. There SHALL NOT be a bottom-right floating action button or an「AI Agent」text pill in the top bar.

When the dock is open, the top bar button icon SHALL remain 🤖 (not switch to ✕); open state MAY be indicated by button styling only.

#### Scenario: Toggle dock from top bar

- **WHEN** user clicks the top bar 🤖 while the dock is closed and publish is configured
- **THEN** the right agent dock opens

#### Scenario: Close dock from header

- **WHEN** user clicks ✕ in the dock header
- **THEN** the dock closes and the main content expands

### Requirement: Resizable agent dock width

The right agent dock SHALL allow horizontal resize by dragging its left edge between 280px and 900px (default 400px). The chosen width SHALL persist in `localStorage` under key `ehcs-agent-dock-width`.

#### Scenario: Resize dock

- **WHEN** user drags the dock left resize handle
- **THEN** dock width updates within min/max bounds and is restored on next open

### Requirement: Agent dock embeds publish chat

The right agent dock SHALL embed the platform WebAPP publish page in an iframe (`/agents/{agentId}/{accessToken}`), not a custom extension ChatPanel on the dashboard page.

#### Scenario: Start check from agent

- **WHEN** user opens the agent dock and sends「开始检查」in the iframe
- **THEN** the platform agent runs the bowi-mcp full-check flow (see ehcs-ai-platform-chat)

### Requirement: Live dashboard refresh

After each rule ingest during a batch check, dashboard metrics SHALL reflect updated data when the user reloads the dashboard or revisits the page.

#### Scenario: After anomaly found

- **WHEN** ingest creates a new pending anomaly and user refreshes the dashboard
- **THEN** overview summary and charts reflect updated counts
