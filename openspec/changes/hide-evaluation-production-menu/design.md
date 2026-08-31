## Context

The client filters menu records using the `isHidden` flag, but currently appends a visible
evaluation fallback when the additive menu migration has not populated the workspace. The seed data
also marks the evaluation entry visible, and installations that already ran the migration retain
that visible record.

## Goals / Non-Goals

**Goals:**

- Make hidden-menu filtering directly testable and ensure hidden evaluation entries are excluded.
- Mark the seeded entry hidden, hide existing records through a reversible migration, and remove the
  client fallback that bypasses menu visibility.

**Non-Goals:**

- Do not remove the evaluation route, page, permission, API, or database tables.
- Do not alter any other workspace or system menu.

## Decisions

- Use the existing `isHidden` contract as the single visibility mechanism. This keeps navigation
  behavior consistent with menu administration and avoids a second name-based denylist.
- Update existing installations with a new idempotent migration
  (`UPDATE ... WHERE code = 'ai-evaluation'`) and make its down migration restore visibility.
- Remove only the evaluation fallback from `NavMain`; retain unrelated compatibility fallbacks.

## Risks / Trade-offs

- Users with a direct bookmark can still reach the page, which is intentional because hiding
  navigation is not access revocation.
- A deployment that skips database migrations will still hide the menu in new seed data and will no
  longer create a frontend fallback; existing visible records remain visible until migrations run.
