## Why

The default Bowi AI Agent platform logo currently reads as a generic hub diagram and does not convey the polished, technology-forward AI identity expected in the primary navigation. Updating this high-visibility mark now strengthens the product's visual identity without changing tenant-provided branding.

## What Changes

- Replace the default Agent platform logo artwork with a distinctive AI-inspired vector mark.
- Use a dark indigo surface, luminous violet-to-cyan accents, and a simplified neural/spark motif that stays legible at the sidebar's 32 px display size.
- Preserve the existing rounded-square footprint, accessible labeling, layout, and custom website-logo override behavior.

### Why now

The logo is shown at the top of the main product navigation on every Agent page, so improving it delivers an immediate and consistent brand-quality improvement.

### Non-goals

- Renaming the product or changing adjacent navigation layout and typography.
- Replacing logos uploaded through website configuration.
- Updating favicons, PWA icons, desktop icons, or unrelated extension branding.

## Capabilities

### New Capabilities

- `agent-platform-brand-logo`: Defines the default Agent platform logo's visual identity, small-size legibility, and custom-branding fallback behavior.

### Modified Capabilities

- None.

## Impact

- Updates the default SVG asset served from `storage/static/avatars/`.
- Adds focused verification for the asset contract and runs frontend validation.
- No API, database, dependency, or configuration changes.
