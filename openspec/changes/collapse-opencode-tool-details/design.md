## Context

The OpenCode source checkout used by BuildingAI lives at `/Users/jiantan/ai_assistant/opencode`.
Its session timeline already passes `shellToolPartsExpanded` and `editToolPartsExpanded` into a pure
`partDefaultOpen` helper, while the embed marker is available in the app URL. The existing
`BasicTool` component already provides keyboard-accessible `Collapsible` triggers and controlled
open state. See proposal.md and the capability spec for the observable contract.

## Goals / Non-Goals

**Goals:**

- Make the embed-specific default for every expandable tool body closed, including shell and
  edit/write/patch tools.
- Preserve direct-route settings and every tool's existing content, trigger summaries, and state
  transitions.
- Cover the default policy with focused tests before changing implementation.

**Non-Goals:**

- No changes to tool execution or event transport.
- No replacement disclosure primitive or CSS-only hiding of tool content.
- No changes to context-tool grouping or special todo/question behavior.

## Decisions

1. **Apply the policy at the timeline default-open boundary.** The existing `partDefaultOpen` helper
   is the single place where shell/edit defaults are resolved. Pass an embed-aware false value from
   the app timeline (or resolve it in the helper) so all specialized renderers receive the same
   default. This avoids duplicating `defaultOpen={false}` across write, edit, patch, and shell
   renderers.

   **Alternative rejected:** force every `BasicTool` instance closed. That would override explicit
   direct-route settings and could change tools that intentionally open by default (todos/questions).

2. **Keep the disclosure uncontrolled until user interaction, with the existing controlled bridge.**
   `BasicTool` already exposes the header as a `Collapsible.Trigger`, so clicking or keyboard input
   expands the existing deferred body without a second state machine.

   **Alternative rejected:** hide body content with CSS. CSS would leave expensive content mounted and
   would not provide correct `aria-expanded`/keyboard semantics.

3. **Scope the override to `buildingaiEmbed=1`.** Direct OpenCode routes continue honoring the
   existing settings toggles, preserving backwards compatibility for users who prefer expanded
   shell/edit parts.

   **Alternative rejected:** change the global defaults. That would be a broader UX change than the
   user's embedded BuildingAI request.

## Risks / Trade-offs

- **[Risk]** A stale managed runtime could hide the source change. → Run focused OpenCode tests and
  rebuild the runtime/web artifact used by the BuildingAI service.
- **[Risk]** A future tool renderer bypasses `partDefaultOpen`. → Keep policy tests at the helper
  boundary and manually verify shell/write/edit headers still toggle their existing content.
- **[Risk]** Deferred content is not mounted until expansion. → This is intentional; the header remains
  available and opening the tool uses the existing deferred mount path.

## Migration Plan

Rebuild the OpenCode web/runtime artifact and restart only through the repository's normal deployment
workflow. Rollback is limited to restoring the prior runtime bundle; no persisted data migration is
needed.
