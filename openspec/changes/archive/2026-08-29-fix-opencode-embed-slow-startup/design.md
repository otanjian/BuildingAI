## Context

The web controller currently performs context construction, an OpenCode metadata update, and (for
placeholder titles) a session GET serially before returning the iframe URL. These calls are optional
for first paint; creating and binding a new session are not. The client already refetches
placeholder-title embed data, so it can observe a title synchronized after the initial response.

## Goals / Non-Goals

**Goals:**

- Shorten time to the first iframe URL for existing sessions.
- Keep title and metadata enrichment eventually consistent.
- Work with the current API response and older OpenCode runtimes.

**Non-Goals:**

- Changing the OpenCode protocol or iframe URL shape.
- Making new session creation asynchronous, because the URL must reference the bound session.
- Deferring billing initialization, which protects usage accounting before the iframe can send
  turns.

## Decisions

1. Existing-session metadata refresh will run in a detached, caught promise. It remains best-effort
   as it was previously, but no longer blocks the response. The operation captures immutable request
   values so it cannot depend on a disposed request object.
2. Placeholder title lookup and persistence will run in a detached, caught promise. The response
   returns the persisted placeholder and `titleSynced: false`; the existing client refetch interval
   will discover a later title without a contract change.
3. New session creation continues to include the complete system context and title mode
   synchronously. This preserves behavior for the first turn and for runtimes with no metadata PATCH
   support.
4. Tests will control deferred promises and flush microtasks explicitly, proving response timing and
   eventual side effects without introducing timers into production code.

## Risks / Trade-offs

- [Metadata race] A user may send the first turn before an existing session’s refreshed context
  arrives → the existing context remains in the session, and the refresh is still started
  immediately; failures are contained as before.
- [Title delay] History may show the placeholder briefly → the current client polling behavior
  continues to retry while the title is unresolved.
- [Process shutdown] Detached work can be interrupted during shutdown → enrichment is
  cosmetic/best-effort and does not affect session access or billing guarantees.

## Migration Plan

Deploy the API change normally; no schema migration or client rollout is required. Roll back by
restoring the controller’s awaited enrichment calls if runtime behavior needs comparison.
