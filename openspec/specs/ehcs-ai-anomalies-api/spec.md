# ehcs-ai-anomalies-api Specification

## Purpose
TBD - created by archiving change ehcs-ai-v1. Update Purpose after archive.
## Requirements
### Requirement: List anomalies with filters

The API SHALL list `ehcs-check_results` with optional query filters `risk` (高/中/低) and `status` (待解决/已解决/ai自动修复).

#### Scenario: Filter by risk

- **WHEN** client requests anomalies with `risk=高`
- **THEN** only high-risk rows are returned

### Requirement: Dashboard summary metrics

`GET /dashboard/summary` SHALL return: total rules, enabled rules, pending anomaly count, high-risk pending count, health score, auto-fix rate.

#### Scenario: Health score calculation

- **WHEN** there are 1 high, 2 medium, 1 low pending anomalies
- **THEN** health score equals `100 - (10 + 10 + 2) = 78`

### Requirement: Seven-day trend

`GET /dashboard/trend` SHALL return daily anomaly counts for the last 7 days.

#### Scenario: Trend series

- **WHEN** anomalies exist on multiple days within 7 days
- **THEN** each day in the series includes a non-negative count

### Requirement: Recent anomalies

`GET /dashboard/recent-anomalies` SHALL return up to 5 rows ordered by `check_time` descending.

#### Scenario: Limit five

- **WHEN** more than 5 anomalies exist
- **THEN** response contains exactly 5 most recent items

