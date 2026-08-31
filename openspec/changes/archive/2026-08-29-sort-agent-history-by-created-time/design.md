## Context

The agent detail page passes `sortBy: "updatedAt"` to the existing paginated conversation endpoint. The endpoint already accepts `createdAt` and performs descending database ordering before pagination. See `proposal.md` for motivation and `specs/agent-history-creation-order/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Make creation time the explicit sort key for the agent detail history request.
- Preserve server-side ordering across all fetched pages.
- Prevent regressions with a focused test of the page's query contract.

**Non-Goals:**

- Client-side sorting of already paginated results.
- Changing the administrator conversation log sort selector or unified homepage history.
- Adding a new API parameter or data migration.

## Decisions

### Request `createdAt` from the existing history endpoint

The detail page will change its query parameter from `updatedAt` to `createdAt`. This reuses the endpoint's existing sort allowlist and descending query-builder path, so ordering happens before pagination and the client receives globally ordered pages.

Alternative considered: sort `conversationsData.items` in the browser. This was rejected because the hook fetches paginated server results and client-only sorting could not guarantee a correct global order.

### Add a source-level page contract regression test

The page currently wires the query parameter inline. A focused Vitest contract test can demonstrate the regression without introducing a new production abstraction solely for testability. It will assert that the agent detail history request names `createdAt` and excludes the previous `updatedAt` contract.

Alternative considered: a component render test. This was rejected because mounting the full agent detail page requires extensive providers and mocks unrelated to this one-parameter behavior.

## Risks / Trade-offs

- [History no longer promotes active older conversations] → This is the requested stable creation-time behavior and is documented in the specification.
- [A source contract test is coupled to page syntax] → Keep the assertion narrowly scoped to the query call and use it only as regression coverage for this inline configuration.

## Migration Plan

Deploy the updated client bundle and restart the local services. Rollback is the single query-parameter change; no persisted data changes are involved.
