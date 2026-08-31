## Purpose

Lets users manually rename agent conversations from the agent chat history panels so titles stay readable and match the global sidebar rename experience.

## ADDED Requirements

### Requirement: Rename from agent detail chat history

The agent detail chat history panel SHALL allow the user to rename a conversation via a hover rename icon and rename dialog, and SHALL persist the new title through the existing agent conversation update API.

#### Scenario: Open rename dialog from history row

- **WHEN** the user clicks the hover rename icon on a history row
- **THEN** a rename dialog opens with the current title prefilled

#### Scenario: Confirm a new title

- **WHEN** the user enters a non-empty title different from the current title and confirms
- **THEN** the system updates the conversation title
- **AND** the history list shows the new title without requiring a full page reload

#### Scenario: Reject empty title

- **WHEN** the rename dialog title field is empty or whitespace-only
- **THEN** the confirm action is disabled or does not submit

#### Scenario: Cancel or unchanged title

- **WHEN** the user cancels the dialog, or confirms without changing the trimmed title
- **THEN** the system does not call the update API
- **AND** the displayed title remains unchanged

### Requirement: Archive remains available as a hover icon

The agent detail chat history row SHALL show a hover archive icon alongside rename, preserving existing archive behavior.

#### Scenario: Archive from hover icon

- **WHEN** the user clicks the hover archive icon on a history row
- **THEN** the conversation is archived with the same outcome as the previous hover archive control

### Requirement: Site-chat history rename parity

The published/site agent chat history list SHALL provide the same hover rename and archive icon behavior as the agent detail chat history panel.

#### Scenario: Rename from site-chat history

- **WHEN** the user renames a conversation from the site-chat history list
- **THEN** the title is persisted and the list reflects the new title
