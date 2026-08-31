## Why

BuildingAI users currently lack a single place to create, assign, track, and complete lightweight work items. Decisions and follow-up work therefore remain scattered across conversations and business applications, with no reliable view of what a user created or is responsible for.

**Why now:** BuildingAI already has authenticated users, departments, configurable user navigation, and reusable web/API foundations. A focused personal todo center can turn those foundations into an immediately useful execution surface without introducing a full project-management system.

## What Changes

- Add a user-facing **My Todos** page in the standard BuildingAI shell.
- Support creating a todo with a creator, one assignee, planned completion date, current progress, and system-managed actual completion time.
- Provide three primary tabs: **In Progress**, **Completed**, and **All**.
- Provide filters for keyword, creator, assignee, planned completion date range, and progress range; filters combine with the selected tab.
- Enforce a server-side data scope: a user can see a todo only when they created it or are its current assignee.
- Let creators maintain task definition and assignment, while creators and assignees can update progress and completion state.
- Keep status, progress, and actual completion time consistent when completing or reopening a todo.
- Add a configurable standard-shell navigation entry and a count of incomplete todos assigned to the current user.

**Non-goals:** This change does not add multiple assignees, subtasks, projects, tags, recurring todos, comments, notifications, approval workflows, organization-wide administrator access, automatic extraction from AI conversations, or external application synchronization.

## Capabilities

### New Capabilities

- `personal-todo-center`: User-scoped todo creation, assignment, lifecycle management, tabbed views, filters, navigation, and authorization behavior.

### Modified Capabilities

- None.

## Impact

- **Web:** New My Todos route and page in `packages/client`, shared query/mutation contracts, and a configurable entry in the standard user sidebar.
- **API:** New authenticated web endpoints for todo assignee lookup, list/count/detail, create, update, progress/completion, reopen, and delete operations.
- **Database:** New todo persistence with user relationships, lifecycle timestamps, indexes for visibility and list queries, and soft deletion.
- **Security:** Every read, count, filter, and mutation must apply creator-or-assignee scope on the server; administrator status does not implicitly bypass it.
