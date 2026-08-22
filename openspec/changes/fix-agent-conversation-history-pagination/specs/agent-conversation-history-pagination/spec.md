## Purpose

Ensures agent history panels expose the complete paginated conversation collection so users can
reliably find older conversations that are counted by the agent summary.

## ADDED Requirements

### Requirement: Complete authenticated conversation history

The authenticated agent detail history panel MUST display every non-archived conversation returned
by the conversation list API, not only the first page.

#### Scenario: More conversations than one API page

- **WHEN** an agent has more conversations than the first page size
- **THEN** the history panel loads subsequent pages and displays the additional conversations in the
  API's requested sort order

#### Scenario: Empty or single-page history

- **WHEN** the API reports zero or one page of conversations
- **THEN** the history panel displays the available records without making unnecessary page requests

### Requirement: Complete published conversation history

The published/site-chat history panel MUST display every conversation available to the current
access token and anonymous owner across all API pages.

#### Scenario: Site history crosses a page boundary

- **WHEN** the published agent has more conversations than the initial page
- **THEN** the site history loads all remaining pages and displays each conversation once

### Requirement: Stable and bounded page merging

History pagination MUST stop at the API-reported final page, preserve the requested ordering, and
deduplicate repeated conversation IDs when records overlap between pages.

#### Scenario: Repeated record across pages

- **WHEN** two page responses contain the same conversation ID
- **THEN** the history list renders one entry for that ID using the latest record encountered

#### Scenario: Temporary page failure

- **WHEN** a later page request fails
- **THEN** already loaded records remain visible and the client does not loop indefinitely or
  discard the first page
