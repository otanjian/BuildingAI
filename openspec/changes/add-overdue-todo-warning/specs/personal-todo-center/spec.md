## MODIFIED Requirements

### Requirement: My Todos provides three lifecycle tabs
The My Todos page SHALL provide the tabs **In Progress**, **Completed**, and **All**, defaulting to **In Progress**. In Progress SHALL contain visible, non-deleted todos with progress below 100; Completed SHALL contain visible, non-deleted todos with progress equal to 100 and an actual completion time; All SHALL contain both lifecycle states. Each row SHALL display the todo's creator, assignee, planned completion date, progress, and actual completion time when completed. An in-progress todo SHALL be marked as overdue when it has a planned completion date earlier than the current calendar date. Completed todos and todos without a planned completion date SHALL NOT be marked overdue.

#### Scenario: Open My Todos
- **WHEN** a user opens the My Todos page without a tab selection
- **THEN** the In Progress tab is selected and only their visible in-progress todos are listed

#### Scenario: View completed todos
- **WHEN** a user selects the Completed tab
- **THEN** only their visible completed todos are listed with actual completion time

#### Scenario: View all todos
- **WHEN** a user selects the All tab
- **THEN** both visible in-progress and completed todos are listed without duplicates

#### Scenario: Mark an unfinished past-due todo
- **WHEN** an in-progress todo has a planned completion date before the current calendar date
- **THEN** its row displays a visible “已逾期” warning indicator
- **AND** the warning is exposed as equivalent text for assistive technologies

#### Scenario: Keep non-overdue todos unmarked
- **WHEN** a todo is completed, has no planned completion date, or has a planned completion date on or after the current calendar date
- **THEN** its row does not display an overdue warning indicator

#### Scenario: Refresh overdue status by date
- **WHEN** the current calendar date advances while the page is rendered again
- **THEN** an otherwise unchanged in-progress todo is marked overdue as soon as its planned completion date is in the past
