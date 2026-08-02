## Purpose

Provides a unified conversation history experience on the homepage, merging direct AI conversations with agent-based conversations into a single time-sorted list, so users can access all their AI interactions from one place.

## ADDED Requirements

### Requirement: Unified conversation history API

The system SHALL provide an API endpoint that returns a merged, time-sorted list of the current user's direct conversations (`ai_chat_record`) and agent conversations (`ai_agent_chat_record`), excluding soft-deleted and anonymous records.

#### Scenario: Fetch unified history for authenticated user

- **WHEN** an authenticated user requests `GET /ai-conversations/unified`
- **THEN** the system returns a paginated list containing both direct conversations and non-anonymous agent conversations associated with the user's `userId`
- **AND** results are sorted by `updatedAt` descending
- **AND** each item includes `type` ("direct" or "agent"), `id`, `title`, `createdAt`, `updatedAt`
- **AND** agent-type items include `agentId` and `agentName`
- **AND** soft-deleted records are excluded

#### Scenario: Keyword search across both conversation types

- **WHEN** the user provides a `keyword` query parameter
- **THEN** the system searches across both `ai_chat_record.title` and `ai_agent_chat_record.title`
- **AND** returns matching results in the unified format

#### Scenario: Pagination support

- **WHEN** the user provides `page` and `pageSize` query parameters
- **THEN** the system returns the corresponding page of merged results
- **AND** includes `total`, `page`, `pageSize`, and `totalPages` in the response

### Requirement: Sidebar displays unified history

The homepage sidebar SHALL display the 6 most recent items from the unified conversation history under the "历史记录" section.

#### Scenario: Sidebar shows both direct and agent conversations

- **WHEN** the user views the homepage sidebar
- **THEN** the "历史记录" section displays up to 6 items from the unified API
- **AND** items are sorted by most recent first

#### Scenario: Agent conversations show source label

- **WHEN** an agent conversation appears in the history list
- **THEN** the item displays the agent's name as a source label
- **AND** the item is visually distinguishable from direct conversations

#### Scenario: Sidebar loads even when no agent conversations exist

- **WHEN** the user has only direct conversations and no agent conversations
- **THEN** the sidebar "历史记录" section displays only the direct conversations
- **AND** no error or empty state is shown for agent conversations

### Requirement: Clicking an agent conversation opens the agent chat page

The system SHALL navigate to the agent's chat page with the selected conversation loaded when the user clicks an agent conversation item in the history list.

#### Scenario: Navigate to agent conversation from sidebar

- **WHEN** the user clicks an agent conversation item in the sidebar
- **THEN** the browser navigates to `/agents/:agentId/c/:conversationId`
- **AND** the agent chat page loads with the selected conversation's messages

#### Scenario: Navigate to agent conversation from command dialog

- **WHEN** the user opens "查看全部" and clicks an agent conversation item
- **THEN** the browser navigates to `/agents/:agentId/c/:conversationId`
- **AND** the command dialog closes

### Requirement: Unified history in "查看全部" command dialog

The "查看全部" command dialog SHALL use the unified API for listing, searching, renaming, and deleting conversations.

#### Scenario: Command dialog shows both conversation types

- **WHEN** the user opens "查看全部"
- **THEN** the dialog lists both direct and agent conversations
- **AND** items are grouped by time (today, yesterday, etc.)
- **AND** agent conversation items display the agent name as a source label

#### Scenario: Search across unified history in command dialog

- **WHEN** the user types a keyword in the command dialog search
- **THEN** the system searches across both conversation types
- **AND** displays matching results grouped by time

#### Scenario: Rename an agent conversation from command dialog

- **WHEN** the user renames an agent conversation item in the command dialog
- **THEN** the system updates the conversation title via the existing agent chat record API
- **AND** the UI reflects the new title immediately

#### Scenario: Delete an agent conversation from command dialog

- **WHEN** the user deletes an agent conversation item in the command dialog
- **THEN** the system soft-deletes the conversation via the existing agent chat record API
- **AND** the item is removed from the list

#### Scenario: Infinite scroll loads more unified results

- **WHEN** the user scrolls to the bottom of the command dialog list
- **THEN** the system loads the next page of unified results
- **AND** appends them to the existing list without duplication
