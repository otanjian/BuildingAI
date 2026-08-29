## Context

The embedded OpenCode panel has a dedicated overlay for the period after a session URL is available
and before the iframe emits `load`. The overlay already provides the spinner and positioning needed
for this state; only its copy is inaccurate for new-conversation bootstrap.

## Goals / Non-Goals

**Goals:**

- Centralize the requested Chinese copy at the existing iframe loading-overlay site.
- Preserve the current overlay structure, accessibility semantics, and visual treatment.

**Non-Goals:**

- No changes to session bootstrap, retry, routing, or query behavior.
- No changes to the separate no-route, query-pending, or assistant-turn processing messages.

## Decisions

- Update the literal rendered by the iframe `!iframeLoaded` branch in `opencode-iframe-panel.tsx`.
    - This branch exactly matches the red-boxed state in the supplied screenshot.
    - Rejected alternative: changing every OpenCode loading string, because that would alter
      distinct states outside the requested overlay.
- Add a focused source-level regression test that asserts the requested copy is present and the old
  copy is absent.
    - Rejected alternative: introducing a shared translation key, because this one-off copy change
      has no existing i18n path in the component and would expand scope without user-visible
      benefit.

## Risks / Trade-offs

- [Risk] The repository contains generated `public/web/assets` bundles that may still contain old
  text until a production build runs. → Mitigation: verify source and run the client test suite;
  generated assets are not hand-edited.
- [Risk] Ellipsis punctuation can drift between visually similar strings. → Mitigation: test the
  exact requested ASCII `...` suffix.

## Migration Plan

No data or deployment migration is required. The change rolls back by restoring the previous literal
if product copy is later revised.
