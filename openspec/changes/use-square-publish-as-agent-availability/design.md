## Context

The public alias middleware currently checks `AgentVersionService.hasActiveProductionRelease` after validating the Agent's API key or site token. The existing Agent editor always renders the version/release tab, but its actions are intentionally disabled, leaving marketplace publishing as the only usable release operation. Marketplace state is already persisted on the Agent and is used by public marketplace projections.

## Goals / Non-Goals

**Goals:**

- Centralize the current runtime availability decision on the persisted marketplace state.
- Keep credential validation and tenant/channel authorization unchanged.
- Remove the misleading unfinished release UI from the normal editor.
- Make Feishu and automation calls follow the same public alias behavior.

**Non-Goals:**

- Removing or rewriting the enterprise version/release state machine.
- Automatically creating production release rows or migrating existing release data.
- Changing marketplace review workflow or public token configuration.

## Decisions

1. **Use a narrow availability predicate.** Add a method on the version service (or equivalent domain service) that returns true only when `squarePublishStatus` is `approved` and `publishedToSquare` is true. This avoids treating `pending`, `rejected`, or withdrawn Agents as available. The alternative—checking only `publishedToSquare`—would allow inconsistent legacy rows through.
2. **Change the public gate, not credential checks.** Replace only the missing-production-release condition in the alias middleware with the marketplace predicate. API key/site-token checks remain before it, so marketplace approval never bypasses authentication.
3. **Hide the tab at the navigation boundary.** Remove the release `TabsTrigger` and `TabsContent` from the editor rather than deleting the component. This keeps the internal implementation available for a later re-enabled workflow and leaves the marketplace publish button in the header.
4. **Test at the domain boundary.** Add service tests for approved/published, pending, rejected, and withdrawn states, plus a middleware-level regression test if an existing harness is available. This protects the behavior independently of the UI.

## Risks / Trade-offs

- [Risk] Marketplace approval may be broader than enterprise production governance. → Mitigation: this is an explicit product decision for the current flow; retain the version/release state machine for a future gated mode.
- [Risk] Legacy records may have `publishedToSquare = true` with a non-approved status. → Mitigation: require both fields and add regression coverage.
- [Risk] Users may still have bookmarked the hidden release route/tab state. → Mitigation: the route remains intact; only the normal tab entry is removed.

## Migration Plan

1. Deploy the predicate and middleware change together with the client tab removal.
2. Refresh Agents after marketplace approval and verify public/Feishu invocation with the existing configured token.
3. Roll back by restoring the production-release middleware gate and the tab rendering if marketplace approval is found insufficient.
