# agent-conversation-stats Specification

## Purpose
Keeps agent summary counters consistent with the default history panel.
## Requirements
### Requirement: Visible conversation statistics

The published agent detail response MUST count only conversations that are not deleted, not
archived, and not marked as debug for the current user and agent.

#### Scenario: Archived conversations exist

- **WHEN** an agent has both active and archived conversations
- **THEN** `conversationCount` and the summed `messageCount` include only active conversations

#### Scenario: Debug conversations exist

- **WHEN** an agent has debug and normal conversations
- **THEN** summary statistics exclude debug conversations just as the default history list does

#### Scenario: No hidden conversations exist

- **WHEN** all conversations are active and non-debug
- **THEN** summary statistics equal the records visible in the default history list

