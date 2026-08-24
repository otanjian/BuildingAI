## Context

See `proposal.md` for motivation. The left toggle is rendered by the shared agent header and
currently uses a rotated list-indent icon. The right OpenCode workspace toggle is supplied as a
header action and currently uses a folder-tree icon. Their parent buttons already own the correct
state and click behavior.

## Goals / Non-Goals

**Goals:**

- Use matching outline panel icons that mirror the left and right panel locations.
- Keep the existing icon sizing and inherit the surrounding button colors and states.
- Make a source-level replacement that cannot affect control behavior.

**Non-Goals:**

- No changes to buttons, handlers, state, layout, spacing, labels, or responsive rules.
- No custom SVG asset or new icon dependency.
- No change to unrelated agent or site-chat controls.

## Decisions

1. Use the existing Lucide `PanelLeft` and `PanelRight` components. Their rounded rectangular frame
   and interior side divider closely match the provided reference, they already follow the
   application's outline icon language, and `PanelLeft` is already shipped through the same
   dependency. A custom SVG would add maintenance cost for no behavioral or visual benefit.
2. Render the same side-oriented glyph in both open and closed states. The button's title,
   accessible label, pressed state, and resulting panel movement communicate state; rotating a fixed
   panel metaphor would incorrectly point at the other side.
3. Limit edits to the two icon imports/usages. Focused source regression tests will assert the
   semantic glyphs and ensure the existing handlers and accessibility bindings remain present.

## Risks / Trade-offs

- [Risk] A panel icon could be interpreted as a static layout indicator. → Preserve the existing
  tooltips, accessible labels, hover treatment, and click behavior.
- [Risk] Shared-header changes could affect non-OpenCode desktop chat if reused later. → Change only
  the glyph and keep the existing component interface and button markup intact.
