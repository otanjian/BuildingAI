## ADDED Requirements

### Requirement: Rules overview from database

The dashboard rules table SHALL display `lastCheckAt`, `lastResult`, and `issueCount` from the latest completed `ai_inspection` run's rule results, not from browser `localStorage`.

#### Scenario: Show last result after inspection

- **WHEN** an inspection completes with 21 failures on a rule
- **THEN** that rule row shows `21 项异常` and the check timestamp from the rule result

#### Scenario: No prior inspection

- **WHEN** no `ai_inspection` run has completed
- **THEN** rules show `尚未检查` or equivalent default from API

### Requirement: Inspection in progress indication

While a run is `RUNNING`, the dashboard SHALL indicate that a check is in progress (e.g. disable **开始检查** or show running state).

#### Scenario: Button disabled during run

- **WHEN** an inspection session is active
- **THEN** the user cannot start a second concurrent inspection from the same dashboard

### Requirement: Detail drawer on last result

The user SHALL open a detail view by double-clicking (or activating) the **上次结果** cell when a rule result exists.

The drawer SHALL show conclusion, summary, pass rate, check time, and a paginated table of exception details.

#### Scenario: Open exception list

- **WHEN** the user double-clicks **21 项异常**
- **THEN** a drawer lists doc code, name, field, current and expected values

#### Scenario: Pass result

- **WHEN** the user opens a **通过** result
- **THEN** the drawer shows pass summary without exception rows

#### Scenario: Failed check

- **WHEN** the user opens **检查失败**
- **THEN** the drawer shows error summary and optional raw assistant excerpt

### Requirement: Dashboard score alignment

After inspection complete, the health score and trend SHALL reflect the completed `ai_inspection` run (same scoring weights as batch runs).

#### Scenario: Score updates

- **WHEN** an inspection completes with high-severity failures
- **THEN** the dashboard score decreases according to configured weights
