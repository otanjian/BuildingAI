## 1. Persistence Model and Migration

- [x] 1.1 Add failing entity-schema tests for todo UUID identity, creator and assignee relations,
      date-only planned completion, lifecycle consistency constraints, soft deletion, and required
      access-path indexes
- [x] 1.2 Add the shared personal-todo entity, lifecycle constants/types, entity export, and API
      database registration needed to satisfy the schema tests
- [x] 1.3 Add an idempotent database migration that creates the todo table, foreign keys, checks,
      comments, and partial creator/assignee indexes, with a rollback that preserves unrelated
      schema
- [x] 1.4 Add migration tests for fresh creation, repeated execution safety, and rollback behavior

## 2. Todo Domain Service

- [x] 2.1 Add failing service tests proving list, detail, count, and mutation queries always enforce
      non-deleted creator-or-current-assignee scope, including root users and former assignees
- [x] 2.2 Implement the todo service's shared visibility predicate and scoped list/detail/count
      queries with pagination, default ordering, and not-found behavior for unrelated records
- [x] 2.3 Add failing service tests for creator-only task-definition, reassignment, and delete
      operations plus creator-or-assignee lifecycle operations
- [x] 2.4 Implement creator-only task-definition/reassignment/soft-delete operations and
      creator-or-assignee progress, complete, and reopen operations
- [x] 2.5 Add failing lifecycle tests for progress validation, atomic completion timestamps,
      reopening at 99 percent, clearing completion time, and stale-update conflict handling
- [x] 2.6 Implement lifecycle normalization and optimistic concurrency so status, progress, and
      actual completion time cannot diverge

## 3. API Contracts and Assignee Directory

- [x] 3.1 Add failing DTO/controller tests for create, list filters, tab selection, detail, edit,
      progress, complete, reopen, delete, count, invalid ranges, forged creator input, and
      authentication
- [x] 3.2 Implement the authenticated todo web controller, validated DTOs, response mappings, and
      module registration against the domain service
- [x] 3.3 Add failing assignee-directory tests for self inclusion, active-user search, result
      limits, minimal returned fields, department names, and rejection of disabled/deleted/unknown
      assignment targets
- [x] 3.4 Implement the todo-scoped assignee lookup and server-side assignment revalidation without
      reusing knowledge-base-specific filtering
- [x] 3.5 Add integration tests covering all three tabs combined with keyword, creator, assignee,
      inclusive planned-date, and inclusive progress filters under the mandatory visibility scope

## 4. Shared Web Client Contracts

- [x] 4.1 Add query-key and request-contract tests for normalized tab/filter/page parameters and the
      assigned in-progress count
- [x] 4.2 Implement shared todo and assignee types plus list, detail, count, create, edit, progress,
      complete, reopen, and delete query/mutation hooks
- [x] 4.3 Add mutation-cache tests proving successful writes refresh affected lists, details, and
      sidebar count without a document reload

## 5. My Todos Page

- [x] 5.1 Add failing route and view-state tests for `/todos`, default In Progress selection,
      Completed and All tabs, URL-backed filters, pagination reset, filter clearing, and
      invalid-range prevention
- [x] 5.2 Implement the authenticated `/todos` route and page shell with three lifecycle tabs,
      loading/error/empty states, pagination, and URL search-parameter synchronization
- [x] 5.3 Add component tests for compact todo rows showing creator, assignee, planned completion
      date, progress, and completed-at data only when applicable
- [x] 5.4 Implement responsive todo rows and accessible progress/lifecycle actions, preserving dense
      desktop columns and readable narrow-screen metadata
- [x] 5.5 Add interaction tests for keyword debounce, creator/assignee selectors, inclusive
      planned-date/progress ranges, active-filter display, clear-all behavior, and combined query
      submission
- [x] 5.6 Implement the desktop filter bar and narrow-screen filter sheet/popover with validation,
      active-filter visibility, and clear-all behavior
- [x] 5.7 Add form authorization and validation tests for create/edit/reassign/delete, creator-only
      controls, assignee progress controls, stale edit conflicts, and disabled-user assignment
      errors
- [x] 5.8 Implement create/edit dialogs and authorized mutation actions with focused feedback,
      conflict recovery, and server-error handling

## 6. Navigation and Upgrade Compatibility

- [x] 6.1 Add seed and upgrade tests proving a stable My Todos menu item is present on fresh
      installs, inserted once for existing configs, and does not reorder or overwrite customized
      menus
- [x] 6.2 Add the default My Todos menu entry and idempotent existing-install configuration patch
      while keeping the `/todos` route available when the entry is hidden
- [x] 6.3 Add sidebar tests proving the badge counts only in-progress todos assigned to the current
      user and refreshes after complete, reopen, create, reassignment, and delete operations
- [x] 6.4 Implement the stable-menu-ID sidebar badge integration with collapsed, expanded, loading,
      and hidden-entry states

## 7. Verification

- [x] 7.1 Run focused API entity, migration, service, controller, authorization, lifecycle,
      assignee, and filter tests and resolve every regression
- [x] 7.2 Run focused client service, route, tab/filter, row, form, responsive, and sidebar tests
      and resolve every regression
- [x] 7.3 Run affected-package lint and typecheck commands, the relevant production build, and
      `git diff --check`
- [x] 7.4 Manually verify desktop and mobile flows for self-assigned, assigned-to-me,
      created-for-others, reassigned, completed, reopened, filtered, empty, and unauthorized states
- [x] 7.5 Run `openspec validate add-personal-todo-center --strict` and record fresh verification
      evidence before marking the change complete

## 8. Progress Persistence Regression

- [x] 8.1 Add a failing service regression test proving browser-millisecond versions match
      PostgreSQL timestamps within the same millisecond while retaining stale-update conflicts
- [x] 8.2 Implement millisecond-window optimistic concurrency for todo updates and soft deletes
- [x] 8.3 Run focused API tests, typecheck/lint, browser verification of progress persistence,
      `git diff --check`, and strict OpenSpec validation
