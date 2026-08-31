## 1. Shared pagination

- [x] 1.1 Add a reusable paginated conversation-list fetch/merge helper with a 100-page safety cap
      and latest-record-wins ID deduplication.
- [x] 1.2 Update the authenticated agent conversation query to use the helper while preserving its
      existing query key and result shape.
- [x] 1.3 Update the public/site-chat conversation query to use the helper while preserving
      access-token and anonymous-owner headers.

## 2. Verification

- [x] 2.1 Add unit tests for single-page, multi-page, duplicate-ID, and later-page failure behavior.
- [x] 2.2 Run focused client tests, typecheck, lint, and
      `openspec validate fix-agent-conversation-history-pagination`.

Verification note: the focused Vitest suite and strict OpenSpec validation pass. The touched
services package lint passes with two unrelated pre-existing warnings. Workspace typecheck remains
blocked by existing repository TypeScript errors.
