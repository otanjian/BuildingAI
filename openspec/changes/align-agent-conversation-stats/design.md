## Context

`AgentChatRecordService.getStats` is used by the published agent detail endpoint shown in the
sidebar. It currently filters only `isDeleted`, while `listUserConversations` defaults to
`archivedAt IS NULL` and excludes debug records. The two values therefore describe different sets.

## Goals / Non-Goals

**Goals:**

- Use one explicit default-visible predicate for summary counts.
- Keep the existing response shape and sidebar rendering unchanged.
- Cover archived and debug records with unit tests.

**Non-Goals:**

- Changing the logs query, archive endpoint, or retention policy.

## Decisions

1. Apply `archivedAt IS NULL` and `(metadata ->> 'isDebug') IS DISTINCT FROM 'true'` in `getStats`,
   matching the default conversation-list query.
2. Keep the user and agent filters unchanged so counts remain scoped to the signed-in owner.
3. Test the generated query-builder calls rather than requiring a live database.

## Risks / Trade-offs

- Existing users may see a lower counter after archived records are excluded; this is intentional
  because it now reflects the visible history.
- Debug records are excluded from user-facing counts, consistent with the history API.
