## Context

BuildingAI already maps local conversation identifiers to OpenCode sessions and renders the mapped
session through `OpencodeIframePanel`. The current OpenCode branch wraps that iframe in a two-panel
layout whose first panel is only explanatory placeholder content. BuildingAI also already has an
authenticated, path-safe workspace list/content proxy and a reusable workspace tree/preview
component. OpenCode already produces and renders typed reasoning, tool, and text parts. See
proposal.md for motivation.

The hard constraint is that the iframe framework is authoritative: its element, source query,
session mapping, authentication, load/error behavior, and lifecycle remain unchanged.

## Goals / Non-Goals

**Goals:**

- Make the existing iframe the sole conversation surface.
- Compose existing BuildingAI file capabilities as a non-destructive overlay.
- Resume the latest conversation deterministically before creating a draft.
- Reuse OpenCode's native typed parts and apply visual changes only in embed mode.
- Keep implementation small, testable, and reversible.

**Non-Goals:**

- No native replacement conversation panel or cross-frame prompt transport.
- No iframe key/source/lifecycle changes for files or presentation.
- No file editing, folder download, large-file streaming, or arbitrary CSS injection.
- No heuristic classification of ordinary text as model reasoning.

## Decisions

### 1. Remove the outer placeholder; do not touch the iframe component

The OpenCode branch in `AgentChatPage` will render the existing `OpencodeIframePanel` directly in
the remaining main area. The component's iframe markup and current props remain unchanged except for
BuildingAI header children used for parent-owned actions.

**Alternative:** hide the placeholder with CSS. Rejected because it leaves unnecessary panel state
and an invisible resize boundary.

### 2. Use a parent-owned Sheet for files

The shared BuildingAI header receives a project-files button. A right-side `Sheet` renders the
shipped `OpencodeWorkspacePanel`. Sheet state is outside `OpencodeIframePanel`; opening it does not
alter the iframe `key`, `src`, or render branch. The panel component receives a presentation option
to avoid a redundant inner title when hosted by the Sheet.

**Alternative:** add a third resizable panel. Rejected because it changes iframe size and introduces
lifecycle risk during panel composition.

### 3. Reuse `/file/content` for preview and download

OpenCode already returns `{ type, content, encoding, mimeType }` for text and binary data.
BuildingAI will preserve those fields instead of narrowing binary content into an error. A pure
client helper will convert text or Base64 into a Blob and derive the basename. This avoids a new
endpoint while meeting normal project-file needs.

The upstream `.trim()` must be removed so preview/download content is byte-faithful for UTF-8 text.
Dot-segment rejection is applied to list and content requests, not only display filtering.

**Alternative:** add a streaming download route. Deferred until large-file requirements exist.

### 4. Select the latest conversation from the existing ordered query

The existing history endpoint already orders by `updatedAt DESC` and excludes debug/archived
records. A pure resolver returns `wait`, `open-latest`, `create-draft`, or `error`. The route effect
runs only without `uuid`, and a ref prevents duplicate draft creation under StrictMode.

### 5. Embed-only theme compatibility without a new iframe protocol

The existing `buildingaiEmbed=1` predicate will mark the OpenCode document root with an embed data
attribute. Embed CSS will use BuildingAI-compatible neutral colors and shared Inter/system font
stacks in light and dark media modes. BuildingAI will set the existing iframe element's standard
`color-scheme` style from its resolved theme. The embedded document's `prefers-color-scheme` media
query therefore follows BuildingAI even when its manually selected theme differs from the operating
system, without changing iframe source/key/lifecycle or adding cross-frame messaging.

### 6. Style existing OpenCode parts instead of remapping them

In embed mode, reasoning summaries are forced visible through the existing settings accessor only at
the timeline projection call site. Existing `reasoning`, `tool`, and `text` parts remain unchanged.
Reasoning receives a labeled collapsible presentation; tool components and final Markdown remain
their existing native implementations.

Direct OpenCode routes continue to honor user settings and existing styles.

## Risks / Trade-offs

- **[Risk] File content responses can be memory-heavy for large binaries.** → Keep this change
  scoped to ordinary project files and surface a clear failure; add streaming only when required.
- **[Risk] Theme synchronization accidentally remounts or re-addresses the iframe.** → Limit the
  parent change to the existing element's `color-scheme` style; keep source, key, and lifecycle
  unchanged.
- **[Risk] Existing dirty changes overlap the chat layout and OpenCode embed files.** → Patch only
  the latest working-tree state and avoid reverting unrelated edits.
- **[Risk] Reasoning UI can expose verbose model output.** → Default it collapsed after completion
  and preserve native typed-part boundaries.

## Migration Plan

Deploy BuildingAI API/client and the managed OpenCode web bundle together. Rebuild the managed
OpenCode runtime after focused tests. Rollback removes the parent file Sheet and embed-only CSS
while restoring the placeholder layout; no data or database migration is required.
