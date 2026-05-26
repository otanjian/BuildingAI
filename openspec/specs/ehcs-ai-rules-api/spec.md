# ehcs-ai-rules-api Specification

## Purpose
TBD - created by archiving change ehcs-ai-v1. Update Purpose after archive.
## Requirements
### Requirement: List and filter rules

The API SHALL return all check rules for the rules table with fields required by PRD §3.2.1.

#### Scenario: List rules

- **WHEN** client calls `GET /ehcs-ai/console/rules`
- **THEN** response includes rule id, domain, data item, description, score, severity, auto fix, enabled

### Requirement: Create and update rules

The API SHALL support create and update via POST/PATCH with validation: non-empty description, `deduct_score` between 1 and 100.

#### Scenario: Invalid score

- **WHEN** client sends `deduct_score` of 0
- **THEN** API returns validation error and does not persist

### Requirement: Toggle enabled state

The API SHALL support toggling `enabled` without full edit.

#### Scenario: Disable rule

- **WHEN** client calls toggle on an enabled rule
- **THEN** rule becomes disabled and dashboard enabled count decreases on next summary fetch

### Requirement: Generate rule id on create

New rules SHALL receive a unique `rule_id` such as `RULE_XXX` when not supplied.

#### Scenario: Add rule

- **WHEN** user saves a new rule from the modal
- **THEN** a new `rule_id` is assigned and appears in the list

