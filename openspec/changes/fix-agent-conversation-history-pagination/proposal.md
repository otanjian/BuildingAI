## Why

The agent detail sidebar reports more conversations than it renders because it requests only the
first 30 records and never follows the pagination metadata. Users therefore lose access to older
conversation records even though they still exist. This is especially visible for agents with more
than 30 conversations and needs correction now so the history list matches the reported totals.

## What Changes

- Load all pages of an agent's conversation history for the authenticated detail view.
- Load all pages of the published/site-chat history while preserving anonymous ownership and
  ordering.
- Keep page requests bounded and deduplicate records by conversation ID while pages are merged.
- Add regression tests covering lists larger than one page and page-boundary duplicates.

## Capabilities

### New Capabilities

- `agent-conversation-history-pagination`: Conversation history sidebars show every available
  conversation across API pages.

### Modified Capabilities

## Impact

- Client conversation list hooks and agent sidebar components.
- No API contract change; existing `page`, `pageSize`, `totalPages`, and sorting fields are used.
- Additional bounded read requests when an agent has more than one history page.

## Non-goals

- Changing conversation retention, archive semantics, titles, or message pagination.
- Increasing the API's maximum page size or removing server-side pagination.
