## Purpose

Defines a stable agent detail history order based on when each conversation was created, so later conversation activity does not unexpectedly rearrange the sidebar.

## ADDED Requirements

### Requirement: Agent history uses descending conversation creation time
The agent detail conversation history MUST be ordered by conversation `createdAt` in descending order, with the newest-created conversation displayed first.

#### Scenario: Conversations have different creation times
- **GIVEN** an agent has multiple conversations created at different times
- **WHEN** the user views that agent's detail page
- **THEN** the history displays those conversations from newest-created to oldest-created

#### Scenario: An older conversation receives new activity
- **GIVEN** an older conversation appears below a newer-created conversation
- **WHEN** the older conversation receives a message or title update
- **THEN** the older conversation remains below the newer-created conversation

#### Scenario: A new conversation is created
- **GIVEN** the user is viewing an agent's detail page
- **WHEN** a newly created conversation becomes durable and is added to history
- **THEN** the new conversation appears before all conversations created earlier
