## Context

See `proposal.md` for motivation and `specs/personal-todo-center/spec.md` for observable behavior.
BuildingAI's authenticated user shell already exposes static routes through
`packages/client/src/router/index.tsx` while its sidebar content comes from the
`decorate/menu-config` configuration. The API uses authenticated `@WebController` modules and
`@Playground()` identity, and shared web requests live under `packages/@buildingai/web/services`.

Users and departments already exist globally, but the current web user search is specialized for
knowledge-base membership. Todo assignment therefore needs a dedicated minimal directory contract.
The application connects to PostgreSQL through TypeORM and discovers shared entities from
`@buildingai/db`.

## Goals / Non-Goals

**Goals:**

- Make creator-or-assignee scope a reusable server-side invariant for every todo operation.
- Keep lifecycle fields impossible to observe in contradictory combinations.
- Support efficient OR-scoped tab, filter, count, and pagination queries.
- Fit the page and navigation into current BuildingAI user-shell conventions.

**Non-Goals:**

- Database row-level security or implicit administrator visibility.
- Multi-assignee or team ownership abstractions.
- Change-history, notification, AI-tool, and external-work-item integrations in this change.
- A general-purpose user directory API.

## Decisions

### Use one first-party todo entity with explicit user relationships

Add a shared `PersonalTodo` soft-delete entity backed by a `personal_todo` table. Use the
repository's UUID entity convention because todo IDs cross API and browser boundaries. Core columns
are:

- `title TEXT NOT NULL` with an application/DB length constraint and nonblank validation
- `description TEXT NULL`
- `creator_id UUID NOT NULL` and `assignee_id UUID NOT NULL`, both referencing `user.id`
- `planned_completion_date DATE NULL`
- `progress INTEGER NOT NULL DEFAULT 0` constrained to 0 through 100
- `status TEXT NOT NULL DEFAULT 'in_progress'` constrained to `in_progress` or `completed`
- `completed_at TIMESTAMPTZ NULL`
- inherited `created_at`, `updated_at`, and `deleted_at`

Add a consistency check requiring `in_progress` to have progress below 100 and null `completed_at`,
while `completed` has progress 100 and non-null `completed_at`. Keep planned completion as `DATE`,
because the requirement is a calendar date rather than an instant.

Foreign keys use `RESTRICT` for hard deletion because creator and assignee are accountability data;
normal user deletion is already soft deletion. Update the shared entity export and add a migration
that creates constraints, comments, and explicit FK/access-path indexes.

Alternative considered: store creator, assignee, and lifecycle metadata in JSONB. Rejected because
these fields are mandatory relations and frequent filter keys requiring referential integrity and
B-tree indexes.

Alternative considered: put todos in the existing user-memory table. Rejected because memory
retention/deactivation semantics and AI extraction are unrelated to accountable task lifecycle.

### Enforce visibility and mutation authority in the todo service

Create a focused API module under `packages/api/src/modules/todo` with an authenticated web
controller, DTO validation, and a service that owns list predicates and mutations. Every ID-based
lookup starts with:

```text
deleted_at IS NULL
AND (creator_id = current_user_id OR assignee_id = current_user_id)
```

Unrelated records return not found to avoid existence disclosure. After scoped lookup, the service
applies creator-only or creator/assignee mutation rules. Root/admin flags do not bypass this code
path.

Alternative considered: rely on controller checks. Rejected because counts, future internal callers,
and mutations could drift or forget the rule.

Alternative considered: PostgreSQL RLS. Rejected for this change because the application uses pooled
database credentials and has no transaction-local application-user identity convention; adding one
would broaden the security architecture substantially.

### Treat status as derived-but-persisted lifecycle state

Expose progress, complete, and reopen operations through service methods that update `progress`,
`status`, and `completed_at` together. Setting progress to 100 follows the complete transition.
Setting it below 100 follows the reopen/in-progress transition; explicit reopen defaults to 99. Use
the API server clock for `completed_at` and never accept it from clients.

Persist `status` even though it can be inferred, because it is a high-frequency tab/count predicate
and makes lifecycle intent explicit. The DB consistency check protects against drift.

Alternative considered: remove status and infer it only from progress. Rejected because future
lifecycle additions would become ambiguous and every query would encode business state indirectly.

For optimistic concurrency, compare `updated_at` at the precision that survives the JSON/browser
boundary. PostgreSQL stores `TIMESTAMPTZ` with microsecond precision, while JavaScript `Date` and
ISO JSON timestamps retain only milliseconds. Update and delete predicates therefore match the
closed-open millisecond window `[expectedUpdatedAt, expectedUpdatedAt + 1ms)` instead of requiring
an exact timestamp match. Values outside that window remain stale conflicts.

### Use one scoped list query for tabs and filters

Define a paginated list contract with `tab`, `keyword`, `creatorId`, `assigneeId`, `plannedFrom`,
`plannedTo`, `progressMin`, and `progressMax`. The service combines all supplied predicates with the
mandatory visibility predicate. Date bounds and progress bounds are inclusive. Default ordering is
planned completion date ascending with nulls last, then most recently updated first.

Create partial indexes for non-deleted creator and assignee access paths, led by the user FK and
followed by status/planned date. PostgreSQL can combine those indexes for the visibility OR. Start
keyword matching with case-insensitive title/description search; do not add `pg_trgm` until
production volume demonstrates need.

Alternative considered: load all visible todos and filter in the browser. Rejected because it leaks
data into clients unnecessarily, breaks pagination/count accuracy, and scales poorly.

### Provide a dedicated minimal assignee directory

Add a todo-scoped assignee lookup that searches active, non-deleted users, includes the current
user, joins department display names, limits results, and returns only ID, display name, avatar, and
department names. Creation and reassignment independently revalidate the selected ID so stale search
results cannot assign disabled users.

Alternative considered: reuse the existing web user search unchanged. Rejected because it excludes
the current user, applies knowledge-base membership rules, and returns fields beyond this selector's
contract.

### Build a dense, responsive action list in the standard shell

Add `/todos` as an authenticated static route. The page header contains title and create action; a
three-tab control sits above a compact filter bar. Desktop rows keep title and progress visually
dominant while showing creator, assignee, planned date, and completion time in aligned secondary
columns. Narrow layouts stack row metadata and move filters into a sheet/popover without hiding
active-filter state. Empty, loading, and error states remain distinct.

Keep the selected tab and serializable filters in URL search parameters so refresh and back/forward
navigation preserve the view. Query-key construction includes the normalized tab, filters, and page.
Successful mutations invalidate list, detail, and assigned-in-progress-count queries.

Alternative considered: a Kanban board. Rejected because there are only two lifecycle states and
filters/progress are more legible in a list.

### Seed and upgrade the configurable sidebar entry

Add a stable `menu_personal_todos` system item pointing to `/todos` in the default web menu seed.
Because the page seeder skips existing installations, add an idempotent upgrade/migration step that
inserts the item into an existing valid menu configuration only when absent and preserves
administrator ordering/customization otherwise. The sidebar recognizes the stable ID to attach the
assigned-in-progress count; hiding or removing the configurable item hides the badge but does not
disable the route.

Alternative considered: hard-code the link outside decoration configuration. Rejected because it
would diverge from the current customizable user navigation model.

## Risks / Trade-offs

- **[Assignee lookup broadens user discoverability]** → Return only minimal display identity,
  require authentication, cap results, and exclude disabled/deleted accounts.
- **[Creator-or-assignee OR queries degrade as data grows]** → Add partial indexes for both
  relationship paths and verify query plans with representative data before adding specialized
  search indexes.
- **[Concurrent creator and assignee edits overwrite state]** → Make lifecycle transitions atomic
  and use a millisecond-normalized `updated_at` version precondition for edit/progress requests,
  returning conflict on stale writes without rejecting PostgreSQL microseconds that the browser
  cannot represent.
- **[Existing customized menus miss the new entry]** → Patch by stable ID idempotently and preserve
  every existing item; keep `/todos` directly routable.
- **[Calendar dates vary by server timezone]** → Parse and return planned completion as an ISO
  calendar date without UTC timestamp conversion.

## Migration Plan

1. Deploy the entity, migration, and API module; the migration creates an empty todo table and
   patches the menu configuration idempotently.
2. Deploy shared web contracts, route, page, and sidebar count integration.
3. Verify existing menu customization remains intact and both fresh and upgraded installations show
   the default entry.
4. Roll back by removing the route/API exposure and sidebar entry. Retain the table during rollback
   to avoid destroying user data; a later explicit data-retention decision may remove it.
