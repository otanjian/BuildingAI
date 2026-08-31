## Why

Opening an OpenCode conversation can wait on optional metadata and title synchronization before the
iframe is even mounted. This makes a remote OpenCode instance feel unavailable, especially for
existing conversations or older compatible runtimes. The issue is now visible in the published agent
flow, where the outer page is ready but the embedded session bootstrap remains pending.

## What Changes

- Return the OpenCode embed URL as soon as the session is available and ownership/billing
  initialization are complete.
- Move existing-session context refresh and generated-title synchronization off the critical
  response path.
- Preserve the current session creation, session binding, title polling, error tolerance, and
  compatibility behavior for older OpenCode runtimes.
- Add regression tests proving optional remote calls do not delay the bootstrap response and still
  complete in the background.

## Capabilities

### New Capabilities

- `opencode-embed-startup-performance`: OpenCode embed bootstrap prioritizes a usable iframe URL
  while eventually applying optional session enrichment.

### Modified Capabilities

- None.

## Impact

- Backend OpenCode embed controller and its tests.
- The existing embed API response remains backward compatible; `conversationId`, `sessionId`, `url`,
  `title`, and `titleSynced` keep their current meanings.
- No OpenCode server upgrade or client-side API change is required.

## Non-goals

- Replacing the OpenCode iframe or changing the remote OpenCode UI.
- Removing session metadata, generated titles, billing initialization, or support for older OpenCode
  versions.
- Claiming to fix latency caused solely by a remote OpenCode server loading a very large history.
