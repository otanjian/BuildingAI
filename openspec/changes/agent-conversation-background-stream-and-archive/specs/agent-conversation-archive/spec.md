# agent-conversation-archive Specification

## Purpose

Agent conversations SHALL support archiving: an archived conversation disappears from the agent chat page's conversation list while remaining visible everywhere else (unified history, direct URL access, statistics). Archiving is a soft, irreversible-by-UI marker that does not delete data.

## ADDED Requirements

### Requirement: Archive an agent conversation

The system SHALL provide an API to archive an agent conversation. Archiving SHALL set an `archived_at` timestamp on the conversation record and SHALL NOT delete the record or its messages.

#### Scenario: Archive own conversation

- **WHEN** a user archives a conversation they own (by `userId`, or by matching `anonymousIdentifier` for anonymous users)
- **THEN** the conversation's `archived_at` is set
- **AND** the conversation record and its messages remain in the database

#### Scenario: Archive another user's conversation

- **WHEN** a user attempts to archive a conversation owned by another user or another anonymous identifier
- **THEN** the system rejects the request with a forbidden error

#### Scenario: Archive a non-existent conversation

- **WHEN** a user attempts to archive a conversation that does not exist or belongs to a different agent
- **THEN** the system returns a not-found error

### Requirement: Conversation list excludes archived conversations

The agent conversation list API SHALL exclude archived conversations by default in the agent chat page.

#### Scenario: Archived conversation hidden from list

- **WHEN** a conversation is archived
- **THEN** it is not returned by the agent conversation list endpoint used by the chat page sidebars

#### Scenario: Unarchived conversations unaffected

- **WHEN** a conversation has no `archived_at`
- **THEN** it continues to appear in the agent conversation list

#### Scenario: Archived conversations still reachable by id

- **WHEN** a user directly opens an archived conversation's URL or fetches it by id
- **THEN** the conversation loads normally with its full history

### Requirement: Archived conversations remain visible in unified history

Archiving SHALL NOT affect the unified conversation history (`/ai-conversations/unified`); archived agent conversations SHALL continue to appear there.

#### Scenario: Archived conversation appears in unified history

- **WHEN** a conversation is archived
- **THEN** it still appears in the unified conversation history for the user
- **AND** it is not treated as deleted

#### Scenario: Unarchiving restores list visibility

- **WHEN** an archived conversation's `archived_at` is cleared (e.g. manually in the database)
- **THEN** it reappears in the agent conversation list

### Requirement: Archive button in agent chat sidebars

The agent chat page (both the published site-chat page and the logged-in detail page) SHALL expose an archive action on each conversation entry in the history list.

#### Scenario: Archive from site-chat sidebar

- **WHEN** a user on the published site-chat page triggers archive on a conversation entry
- **THEN** the conversation is archived and disappears from the list after confirmation

#### Scenario: Archive from detail sidebar

- **WHEN** a user on the logged-in agent detail page triggers archive on a conversation entry
- **THEN** the conversation is archived and disappears from the list after confirmation

#### Scenario: Archive requires confirmation

- **WHEN** a user triggers the archive action
- **THEN** the system prompts for confirmation before archiving
- **AND** cancelling the confirmation does not archive the conversation
