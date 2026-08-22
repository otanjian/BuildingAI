## Context

The authenticated sidebar calls `useAgentConversationsQuery` with `page=1&pageSize=30`, while the
public site-chat service calls the equivalent endpoint with `page=1&pageSize=30`. Both consumers
currently discard `totalPages`, so the UI can never render records after the first page. The API
already returns deterministic sorting and pagination metadata.

## Goals / Non-Goals

**Goals:**

- Centralize bounded page fetching and ID-based merging in the web service layer.
- Keep React query cache entries stable and expose the merged result through the existing hooks.
- Preserve API ordering and latest-record-wins behavior for duplicate IDs.

**Non-Goals:**

- Changing API pagination limits, database queries, archive filters, or message history loading.
- Fetching unbounded data in one request.

## Decisions

1. **Fetch pages in the service hook, not in sidebar components.** Both detail and site-chat
   consumers use hooks, so pagination remains consistent and UI components stay presentational. A
   sequential loop follows `totalPages` with a hard safety cap (100 pages), preventing runaway
   requests if a server returns inconsistent metadata.
2. **Merge by conversation ID with latest record winning.** This handles boundary overlap and keeps
   the record returned by the later page authoritative while preserving the first-seen order for
   unique records.
3. **Keep the existing query key and return shape.** The merged result remains a normal paginated
   result whose `items` contains all fetched records, while `total`, `page`, `pageSize`, and
   `totalPages` retain the first response's metadata. Existing callers need no API changes.
4. **Retain partial results on later-page failure.** A failed page must not erase already loaded
   history. The hook returns accumulated records and logs/warns through the query error path only
   when page one fails; later failures resolve with the partial list.

## Risks / Trade-offs

- [Risk] Large histories issue multiple sequential requests → cap at 100 pages and use the existing
  small page size so each request remains bounded.
- [Risk] Query latency increases for large histories → preserve the current first-page render via
  the query's loading state; later pages are fetched in one query and avoid duplicate component
  logic.
- [Risk] A page overlap can reorder records → retain first-seen slot while replacing its value,
  matching server sort order.
