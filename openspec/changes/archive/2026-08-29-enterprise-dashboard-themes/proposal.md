# Enterprise dashboard themes

## Why

Twenty enterprise extensions shared an EHCS-cloned dashboard (identical layout and copy). Product requires per-scenario visual and information architecture differentiation while keeping one API contract.

## What

- New `@buildingai/extension-dashboard` package with six layout templates and hue-driven theming.
- `dashboard` blocks in `docs/enterprise-ai-apps-registry.json` + generated `enterprise-dashboard.constant.ts`.
- Migrated 20 extensions to thin dashboard pages; **ehcs-ai unchanged**.

## Scope

- Web only; `GET /dashboard/overview` unchanged for V1.
- PRD §3.1 notes per app via `patch-prd-dashboard-section.mjs`.
