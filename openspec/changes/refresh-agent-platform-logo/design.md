## Context

See `proposal.md` for motivation. The default sidebar component already resolves a configured website logo before falling back to `/static/avatars/bowiai-agent-platform.svg`, and renders the result as a 32 px rounded image in both sidebar states. The implementation must therefore improve the fallback asset without disturbing runtime configuration or layout behavior.

## Goals / Non-Goals

**Goals:**

- Create a crisp, memorable AI mark that reads clearly at 32 px on the existing dark sidebar.
- Preserve the existing asset URL so deployment and caching paths need no code migration.
- Keep the SVG self-contained, accessible, and compatible with ordinary `<img>` rendering.

**Non-Goals:**

- Introducing animated SVG, external fonts, raster textures, or runtime theme logic.
- Changing component spacing, typography, sidebar interactions, or tenant branding.

## Decisions

### Use a hand-authored SVG asset

The logo will remain an SVG because its geometric motif and compact display need sharp edges at varying pixel densities. A raster-generated image was considered, but it would add resolution variants, larger payloads, and less reliable clarity at the sidebar size.

### Use an “AI aperture” motif

The mark will combine a central luminous diamond/core with three orbital nodes and sweeping connection arcs. This conveys intelligence, coordination, and agent orchestration with fewer shapes than the current hub diagram. A literal robot head and an `AI` monogram were considered, but both are more generic and less consistent with the product's refined dark UI.

### Prefer indigo-black with cyan and electric-violet accents

The near-black indigo base integrates with the sidebar while the split cyan/violet spectrum provides a deliberate technology signal. White is reserved for the central core to establish a strong focal point. Subtle gradients and one restrained glow add depth without compromising small-size legibility.

### Keep the existing fallback contract unchanged

Only the fallback asset content changes. The filename, component path, configured-logo precedence, accessible name, dimensions, and rounded-square geometry remain stable.

## Risks / Trade-offs

- **[Fine SVG details disappear at small size]** → Limit the motif to three nodes, two principal arcs, and a strong central core; validate a 32 px raster rendering.
- **[Glow filters blur or clip]** → Use restrained filter bounds and keep structural strokes fully opaque outside the glow.
- **[Existing cached asset remains visible briefly]** → Preserve the stable path for compatibility; a normal application/static asset refresh will load the updated content.

## Migration Plan

Replace the SVG in place and deploy it with the normal static assets. Rollback consists of restoring the previous SVG contents; no data or configuration migration is required.
