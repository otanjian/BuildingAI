# personal-todo-center Specification

## Purpose
Provide each Bowi AI user with a secure action center for creating, assigning, filtering, progressing, and completing lightweight todos that they created or currently own.
## Requirements
### Requirement: Todos retain accountable ownership and schedule data
The system SHALL store a title, creator, one assignee, planned completion date, current progress, lifecycle status, actual completion time, creation time, and update time for each todo. The creator SHALL be the authenticated user who creates the todo and SHALL NOT be client-selectable or subsequently editable. A newly created todo SHALL default its assignee to the creator when the user does not choose another eligible assignee.

#### Scenario: Create a todo for myself
- **WHEN** an authenticated user creates a todo without selecting an assignee
- **THEN** the system records that user as both creator and assignee
- **AND** initializes the todo as in progress with 0 percent progress and no actual completion time

#### Scenario: Create a todo for another user
- **WHEN** an authenticated user creates a todo and selects an eligible active user as assignee
- **THEN** the system records the authenticated user as creator and the selected user as the single assignee

#### Scenario: Reject a forged creator
- **WHEN** a create or update request attempts to supply or replace the creator identity
- **THEN** the system rejects or ignores that identity and preserves the authenticated creator recorded by the server

### Requirement: Todo visibility is limited to related users
The system MUST return or expose a todo only when the authenticated user is its creator or current assignee. The same creator-or-assignee data scope MUST be applied to lists, tab totals, sidebar counts, detail reads, searches, filters, mutations, and deleted-item lookups. Administrative or root status SHALL NOT implicitly bypass this data scope.

#### Scenario: Creator views an assigned todo
- **WHEN** a user requests a todo that they created and assigned to another user
- **THEN** the system returns the todo

#### Scenario: Assignee views a received todo
- **WHEN** a user requests a todo created by another user for which they are the current assignee
- **THEN** the system returns the todo

#### Scenario: Unrelated user attempts access
- **WHEN** an authenticated user requests or mutates a todo for which they are neither creator nor current assignee
- **THEN** the system returns a not-found response without revealing that the todo exists

#### Scenario: Previous assignee loses access after reassignment
- **WHEN** the creator reassigns a todo to a different user
- **THEN** the previous assignee immediately loses access unless they are also the creator

### Requirement: Todo mutations follow creator and assignee roles
The system SHALL allow only the creator to edit a todo's title, description, planned completion date, or assignee and to delete the todo. The system SHALL allow either the creator or current assignee to update progress, complete the todo, or reopen it. Deleted todos SHALL be soft-deleted and excluded from all normal reads and counts.

#### Scenario: Creator changes task definition
- **WHEN** the creator edits the title, description, planned completion date, or assignee
- **THEN** the system persists the change

#### Scenario: Assignee reports progress
- **WHEN** the current assignee updates progress or completes the todo
- **THEN** the system persists the lifecycle change

#### Scenario: Assignee attempts creator-only edit
- **WHEN** an assignee who is not the creator attempts to change task definition, assignment, or deletion state
- **THEN** the system denies the operation

#### Scenario: Creator deletes a todo
- **WHEN** the creator deletes a todo
- **THEN** it disappears from the creator's and assignee's lists, totals, detail reads, and searches

### Requirement: Progress, status, and actual completion time remain consistent
The system SHALL accept progress only as an integer from 0 through 100. A todo with progress below 100 SHALL have in-progress status and no actual completion time. Reaching 100 percent or invoking completion SHALL set completed status, set progress to 100, and record the server's current time as the actual completion time. Reopening or reducing a completed todo below 100 percent SHALL restore in-progress status and clear its actual completion time.

#### Scenario: Update in-progress percentage
- **WHEN** an authorized user sets progress to an integer from 0 through 99
- **THEN** the todo remains in progress with no actual completion time

#### Scenario: Complete through progress
- **WHEN** an authorized user sets progress to 100
- **THEN** the todo becomes completed and receives a server-generated actual completion time

#### Scenario: Complete through the completion action
- **WHEN** an authorized user invokes the completion action on an in-progress todo
- **THEN** the system sets progress to 100, marks it completed, and records the actual completion time atomically

#### Scenario: Reopen a completed todo
- **WHEN** an authorized user reopens a completed todo without specifying a lower progress
- **THEN** the system sets it to in progress at 99 percent and clears the actual completion time

#### Scenario: Reject invalid progress
- **WHEN** a user submits a non-integer progress or a value outside 0 through 100
- **THEN** the system rejects the request without changing the todo

### Requirement: My Todos provides three lifecycle tabs
The My Todos page SHALL provide the tabs **In Progress**, **Completed**, and **All**, defaulting to **In Progress**. In Progress SHALL contain visible, non-deleted todos with progress below 100; Completed SHALL contain visible, non-deleted todos with progress equal to 100 and an actual completion time; All SHALL contain both lifecycle states. Each row SHALL display the todo's creator, assignee, planned completion date, progress, and actual completion time when completed.

#### Scenario: Open My Todos
- **WHEN** a user opens the My Todos page without a tab selection
- **THEN** the In Progress tab is selected and only their visible in-progress todos are listed

#### Scenario: View completed todos
- **WHEN** a user selects the Completed tab
- **THEN** only their visible completed todos are listed with actual completion time

#### Scenario: View all todos
- **WHEN** a user selects the All tab
- **THEN** both visible in-progress and completed todos are listed without duplicates

### Requirement: Tabs and filters compose into one query
The My Todos page SHALL support filters for title-or-description keyword, creator, assignee, inclusive planned completion date range, and inclusive progress range. All active filters SHALL be combined with each other and with the selected lifecycle tab. Changing a tab or filter SHALL reset pagination to the first page, and the page SHALL provide one action that clears all filters without changing the selected tab.

#### Scenario: Combine tab and filters
- **WHEN** a user selects In Progress, chooses a creator, and provides a planned completion date range
- **THEN** the system returns only visible in-progress todos matching that creator and inclusive date range

#### Scenario: Filter by responsible user and progress
- **WHEN** a user selects an assignee and progress range
- **THEN** the system returns only visible todos whose current assignee and progress match both filters

#### Scenario: Search todo text
- **WHEN** a user enters a keyword
- **THEN** matching is performed case-insensitively against title and description within the user's visible data scope

#### Scenario: Clear filters
- **WHEN** a user clears all filters while viewing the Completed tab
- **THEN** the filter values are removed, pagination returns to the first page, and the Completed tab remains selected

#### Scenario: Reject invalid ranges
- **WHEN** a date or progress range has a lower bound greater than its upper bound
- **THEN** the page identifies the invalid range and does not issue it as a list request

### Requirement: Users can select eligible assignees without exposing sensitive account data
The system SHALL provide authenticated assignee lookup that includes the current user and searches active, non-deleted Bowi AI users. Assignee results SHALL expose only identity fields needed for selection: user ID, display name, avatar, and department names. Disabled or deleted users SHALL NOT be offered for new assignment.

#### Scenario: Search for an assignee
- **WHEN** an authenticated user searches by an eligible user's name
- **THEN** the system returns matching minimal assignee identities without email, phone, permissions, or credentials

#### Scenario: Assign to an ineligible account
- **WHEN** a create or reassignment request names a disabled, deleted, or unknown user
- **THEN** the system rejects the assignment

### Requirement: My Todos is reachable from standard user navigation
The standard Bowi AI shell SHALL provide a configurable My Todos navigation entry that routes to the My Todos page. When the entry is visible, it SHALL show the number of non-deleted in-progress todos currently assigned to the authenticated user; todos merely created by that user for someone else SHALL NOT contribute to this count.

#### Scenario: Show assigned in-progress count
- **WHEN** a user has two in-progress todos assigned to them and one in-progress todo they created for someone else
- **THEN** the My Todos navigation count is two

#### Scenario: Complete an assigned todo
- **WHEN** the user completes a todo assigned to them
- **THEN** the navigation count decreases without requiring a full page reload
