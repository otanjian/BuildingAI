## Context

See `proposal.md` for motivation. The embedded flow creates an OpenCode session before the first
prompt. It currently supplies BuildingAI's “新对话” placeholder as an explicit remote title.
OpenCode only runs its first-message title generator while a session still has its own default
timestamp title, so that explicit placeholder disables generation. Messages entered inside the
iframe also bypass BuildingAI's normal chat submission path.

The client currently opens the workspace in a right-side Sheet. The repository already provides
resizable panel primitives and the workspace browser is a self-contained component.

## Goals / Non-Goals

**Goals:**

- Preserve OpenCode's native first-message title generation for iframe-created sessions.
- Synchronize only a meaningful remote title into an eligible local placeholder and refresh history
  promptly.
- Keep the iframe mounted while an inline workspace panel is toggled or resized.
- Preserve pure BuildingAI history reads when OpenCode is unavailable.

**Non-Goals:**

- Replacing OpenCode's title model or generating a second title in BuildingAI.
- Overwriting a manual or previously meaningful conversation title.
- Redesigning workspace browsing and preview behavior.

## Decisions

### Opt in to an OpenCode-managed initial title for iframe sessions

Add an explicit session-creation option that omits the title field for an iframe-created placeholder
conversation. OpenCode then creates its recognized default title and can replace it after the first
prompt. Other session creation paths keep their existing receipt/title behavior.

Alternative considered: treat “新对话” as a default title inside OpenCode. Rejected because it
couples the standalone OpenCode runtime to a BuildingAI-localized placeholder and broadens behavior
beyond embedded sessions.

### Synchronize through the existing authenticated embed bootstrap

While the mapped BuildingAI title remains a placeholder, let the iframe's authenticated embed
bootstrap poll its mapped OpenCode session at a short interval. The API copies a meaningful
generated remote title into BuildingAI with a conditional update, and the iframe panel invalidates
conversation history when the bootstrap response reports the synchronized title. This keeps
synchronization off the pure history endpoints and naturally covers events that happened before the
client subscribed.

Alternative considered: make every history-list request contact OpenCode. Rejected because history
must remain available independently of the remote runtime.

### Use an inline resizable panel group on desktop

Place the iframe and workspace component in sibling horizontal resizable panels. The Workspace
button controls the collapsible right panel and the overlay Sheet is removed. The panel starts
closed, matching the explicit click-to-open interaction, and is unavailable as an overlay on narrow
screens.

Alternative considered: shrink the chat with fixed-width CSS. Rejected because users need to adapt
the split to file-preview and conversation content.

## Risks / Trade-offs

- [Title generation fails or the client misses an update event] → Poll the current session snapshot
  only while the local title remains a placeholder and leave it unchanged on remote failure.
- [A late remote event overwrites a manual rename] → Re-read and update only when the local title is
  still a recognized placeholder.
- [Resizable panel state conflicts with narrow layouts] → Collapse the right panel under the desktop
  breakpoint and expose the toggle only where side-by-side layout is viable.
- [Repeated polling while title generation fails] → Poll only for a mounted iframe with a
  placeholder title and stop immediately after synchronization or a manual rename.

## Migration Plan

No data migration is required. Deploy API and client together, restart the development stack, and
verify title synchronization plus inline panel behavior in a fresh conversation. Rollback restores
explicit iframe titles and the prior Sheet without changing stored records.
