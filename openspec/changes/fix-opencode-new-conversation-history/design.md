## Context

The agent detail page currently creates a local OpenCode draft UUID from
`OpencodeConversationStore`, navigates to that UUID, and immediately mounts the iframe. The API
embed endpoint is responsible for idempotently creating the database record and remote OpenCode
session, but the iframe query treats its first failure as an error. The history sidebar is backed by
the shared `agents/chat/conversations` React Query key; invalidation is already available at send
acceptance and turn completion, but a local draft can be removed from that list before the first
durable response arrives.

## Goals / Non-Goals

**Goals:**

- Make draft iframe bootstrap resilient to the known database/session initialization race.
- Synchronize the history query with the server response that establishes a new conversation, while
  keeping active-turn status and existing cache behavior intact.
- Cover route decisions, query retry policy, and history synchronization with focused tests.

**Non-Goals:**

- No changes to OpenCode session protocol or message persistence semantics.
- No global polling loop for all history; polling is limited to initialization/active-turn states.
- No changes to non-OpenCode chat routing.

## Decisions

1. **Keep draft IDs stable and make iframe bootstrap retryable.** The client must not replace a
   local draft ID while the API is creating its record, because doing so can detach the active chat
   state. Configure the embed query to retry transient initialization failures with a bounded delay,
   and keep its loading/initializing presentation during those retries. A permanent failure still
   uses the existing error state.

    **Alternative rejected:** create the database conversation in the sidebar click handler. That
    would duplicate the API's idempotent initialization path and require exposing session setup
    earlier than needed.

2. **Insert/refetch history from the durable acceptance boundary.** When the first OpenCode turn is
   accepted, invalidate the agent conversation list and refetch it once so the newly persisted
   title, timestamps, and active-turn metadata become authoritative. The existing query's
   active-turn refetch interval continues to handle subsequent progress.

    **Alternative rejected:** append a client-only history row. It could disagree with server title,
    permissions, archive state, or ordering and would be difficult to reconcile with pagination.

3. **Treat draft initialization as a valid route state.** The route resolver continues to create a
   draft only after history has loaded successfully and is empty; the iframe remains the component
   responsible for durable record/session bootstrap. Existing explicit conversation routes remain
   untouched.

## Risks / Trade-offs

- **[Risk]** Retrying a non-transient permission or validation error delays its display. → Keep the
  retry count bounded and preserve the existing terminal error UI after retries are exhausted.
- **[Risk]** A history refetch races with the list query's active-turn polling. → Use React Query's
  invalidation/refetch semantics and rely on the server response as the single source of truth.
- **[Risk]** HMR/dev-server state can mask a stale compiled bundle. → Run focused tests, rebuild the
  client/runtime as required by the local deployment workflow, then verify new-chat navigation and
  sidebar behavior in the running page.

## Migration Plan

Update client code and tests, rebuild the web bundle through the existing project workflow, and
restart only the services needed to serve the changed client/API code. Rollback is a source/bundle
revert; no database migration is required.
