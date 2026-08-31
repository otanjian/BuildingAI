## Context

The todo API already returns `status` and a date-only `plannedCompletionDate`. The client renders each record through `TodoRow`, so overdue presentation can remain a derived view concern without a database migration or API contract change. See proposal.md and the existing `personal-todo-center` specification for scope.

## Goals / Non-Goals

**Goals:**

- Derive overdue state consistently from the local calendar date, lifecycle status, and planned date.
- Present a compact warning badge in the existing todo row while preserving the current layout and design tokens.
- Provide a semantic label so screen readers receive the same warning as visual users.
- Cover boundary dates and missing-date/completed cases with deterministic tests.

**Non-Goals:**

- No persisted overdue flag, background scheduler, notification delivery, sorting change, or filter.
- No server-side change to lifecycle or sidebar count semantics.

## Decisions

1. **Derive state at render time.** A small pure helper will compare `YYYY-MM-DD` planned dates with a supplied/current local date and require `in_progress`. This avoids stale persisted flags and makes date-boundary behavior directly testable.
2. **Use an explicit warning badge.** `TodoRow` will place an `已逾期` badge beside the lifecycle badge, styled with existing destructive/warning-compatible tokens. The badge will include an accessible label (and the row will expose the state in text) without relying on color alone.
3. **Keep date parsing date-only.** Planned dates are parsed as calendar values rather than UTC timestamps, preventing timezone shifts from marking a same-day task incorrectly. Invalid or absent values are treated as not overdue.

## Risks / Trade-offs

- [Risk] A long-lived page may not re-render exactly at midnight → Mitigation: derive from the current date on every render; normal query/refetch and user interaction re-render the row. No timer is added because the requirement is refresh/render based.
- [Risk] Red styling could reduce contrast in a dark theme → Mitigation: use the shared destructive badge variant and semantic text, with tests asserting the label rather than color implementation.

## Migration Plan

No migration or rollout step is required. Deploy the client change; rollback is limited to reverting the row/helper code.
