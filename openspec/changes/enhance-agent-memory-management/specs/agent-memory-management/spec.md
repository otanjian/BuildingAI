## ADDED Requirements

### Requirement: List accessible agent memories
The system SHALL return active memories owned by the authenticated user only when their associated agents are accessible to that user. Each item SHALL include the agent identifier, agent display name, memory content, and memory timestamps.

#### Scenario: User lists memories
- **WHEN** an authenticated user opens the memory page
- **THEN** the API returns only that user's active memories for agents the user can access
- **AND** each row contains an agent name and content suitable for the two-column UI

#### Scenario: User has no accessible agents
- **WHEN** an authenticated user has no accessible agents
- **THEN** the API returns an empty agent option list and an empty memory list without exposing other users' data

### Requirement: Enforce agent permission on mutations
The system SHALL require the selected agent to be accessible to the authenticated user when creating or updating a memory. Delete and clear operations SHALL be scoped to the authenticated user's records.

#### Scenario: Create memory for an accessible agent
- **WHEN** the user submits an accessible agent and non-empty content
- **THEN** the system creates an active memory associated with that user and agent

#### Scenario: Reject inaccessible agent
- **WHEN** the user submits an agent the user cannot access
- **THEN** the system rejects the request and does not create or modify a memory

#### Scenario: Update memory ownership
- **WHEN** the user updates or deletes a memory id belonging to another user
- **THEN** the system behaves as not found/unauthorized and leaves the other user's memory unchanged

### Requirement: Memory editor interaction
The memory page SHALL provide an editor with an agent selector, content input, a full-screen expansion action, and a close action. The list SHALL expose agent and content as separate columns while retaining row edit and delete actions.

#### Scenario: Open and close editor
- **WHEN** the user opens the new or edit form
- **THEN** the form shows only agents available to the user
- **AND** the user can close it with the explicit close button or cancel action

#### Scenario: Expand content input
- **WHEN** the user activates full-screen editing
- **THEN** the content input expands to the viewport and remains editable
- **AND** the user can exit full-screen or close the editor without submitting
