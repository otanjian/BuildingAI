# enterprise-dashboard-ui Specification

## Purpose

Per-app enterprise extension dashboards SHALL use shared `@buildingai/extension-dashboard` with registry-driven templates and per-app KPI metrics, distinct from ehcs-ai.

## Requirements

### Requirement: Registry-driven dashboard config

Each app in `docs/enterprise-ai-apps-registry.json` SHALL include a `dashboard` object with `template`, `heroChart`, `accentChart`, `healthScoreLabel`, `batchLabel`, and `kpis` (six `{ metric, label }` slots) synced to `ENTERPRISE_DASHBOARD_BY_APP_ID` in `@buildingai/constants`. Metric ids SHALL be resolved by `resolveKpiMetric` so values differ per slot, not only labels.

#### Scenario: Load inv-opt-ai dashboard

- **WHEN** user opens `/extension/inv-opt-ai/dashboard`
- **THEN** KPI cards show app-specific metrics (e.g. `enabledRules`, `domainLeadPending`, `newAnomalies14d`) with labels from registry
- **AND** layout uses template `supply-chain`

#### Scenario: Distinct KPI sets across apps

- **WHEN** user compares `proc-audit-ai` and `inv-opt-ai` dashboards
- **THEN** the six `metric` ids in `dashboard.kpis` differ between apps
- **AND** card values reflect the chosen metric (e.g. `riskHigh` vs `enabledRules`), not a single shared mapping

### Requirement: Six layout templates

The system SHALL support templates: `supply-chain`, `compliance-audit`, `finance`, `operations`, `project-service`, `sustainability`, each with distinct hero/accent chart arrangement.

#### Scenario: Distinguish finance vs supply-chain

- **WHEN** user compares `ar-risk-ai` and `inv-opt-ai` dashboards side by side
- **THEN** template class names differ (`dash-template--finance` vs `dash-template--supply-chain`)
- **AND** primary chart types differ per registry `heroChart`

### Requirement: Theme hue from branding

Dashboard primary color SHALL derive from `APP_BRANDING[appId].hue` via CSS variables `--dash-primary`, `--dash-primary-muted`, `--dash-primary-dark`.

### Requirement: ehcs-ai exclusion

This specification SHALL NOT require changes to `extensions/ehcs-ai` dashboard implementation.

### Requirement: Overview API unchanged

Templates SHALL consume existing `DashboardOverview` from `GET /{appId}/consoleapi/dashboard/overview` without requiring `sceneMetrics` in V1.
