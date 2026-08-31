## Purpose

Keep the evaluation and production-readiness capability available for controlled access while
preventing its unfinished navigation entry from appearing in the workspace menu.

## ADDED Requirements

### Requirement: Evaluation menu is hidden from workspace navigation

The system SHALL exclude the “评估与生产就绪” menu item from user-facing workspace navigation,
regardless of whether the item came from seeded data or an existing menu record.

#### Scenario: Seeded evaluation menu is hidden

- **WHEN** a new installation loads its workspace menu data
- **THEN** the “评估与生产就绪” item is marked hidden and is not rendered in the workspace
  navigation

#### Scenario: Existing evaluation menu is hidden after upgrade

- **WHEN** an existing installation applies the menu visibility update
- **THEN** its `ai-evaluation` menu record is marked hidden and is not rendered in the workspace
  navigation

#### Scenario: Evaluation route remains available

- **WHEN** an authorized user navigates directly to the evaluation route
- **THEN** the evaluation page remains routable and its permission/data behavior is unchanged
