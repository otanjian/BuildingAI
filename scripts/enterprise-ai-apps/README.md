# Enterprise AI Apps — scaffold tooling

Scaffolds 20 BuildingAI extensions from `extensions/ehcs-ai` using `docs/enterprise-ai-apps-registry.json`.

## Commands (from repo root)

```bash
# 1. Scaffold all extensions (skip existing dirs)
node scripts/enterprise-ai-apps/scaffold-from-ehcs.mjs

# 2. Generate ≥30 rules per app
node scripts/enterprise-ai-apps/generate-rules-catalog.mjs

# 3. Generate platform agent config per app
node scripts/enterprise-ai-apps/generate-agent-config.mjs

# 3b. Agent list branding (descriptions without vendor name + per-app SVG avatars)
node scripts/enterprise-ai-apps/generate-agent-avatars.mjs
node scripts/enterprise-ai-apps/patch-agent-branding.mjs
# After extensions are built, push to existing DB rows:
node scripts/enterprise-ai-apps/sync-agent-branding-db.mjs

# 4. Generate demo anomaly seeders
node scripts/enterprise-ai-apps/generate-demo-data.mjs

# 5. Validate rule counts
node scripts/enterprise-ai-apps/validate-catalogs.mjs

# 6. Enterprise dashboard themes (20 apps, not ehcs-ai)
node scripts/enterprise-ai-apps/generate-dashboard-registry.mjs
node scripts/enterprise-ai-apps/migrate-dashboard-to-shared.mjs
node scripts/enterprise-ai-apps/validate-dashboard-registry.mjs
node scripts/enterprise-ai-apps/patch-prd-dashboard-section.mjs

# Single app
node scripts/enterprise-ai-apps/scaffold-from-ehcs.mjs inv-opt-ai
```

## Per-extension seed (after build:api)

```bash
pnpm --filter inv-opt-ai build:api
pnpm --filter inv-opt-ai seed:rules
```

## Sidebar visibility

All 20 enterprise apps are `enabled: true` in `extensions/extensions.json` (plus `ehcs-ai` → 21 entries in the apps menu). After changing flags:

```bash
pnpm extension:sync
```

Then refresh the console. Pilot-only mode: set `enabled: false` on non-P0 apps before sync.

## Enable in console (Node 22+)

```bash
nvm use 22
pnpm extension:sync
pnpm --filter inv-opt-ai build:publish   # api + web
pnpm --filter inv-opt-ai seed:rules
pnpm --filter inv-opt-ai seed:agent      # optional: platform agent row
```

Repeat `build:publish` / `seed:rules` for `mdm-quality-ai` and `proc-audit-ai`.

### Batch build / seed (all 20 apps)

```bash
nvm use 22
# After build:publish on each extension:
while IFS= read -r app; do pnpm --filter "$app" seed:rules; done \
  < <(node -e "require('./docs/enterprise-ai-apps-registry.json').apps.forEach(a=>console.log(a.appId))")

# Platform agents (workspace → 智能体列表); requires build:api first:
node scripts/enterprise-ai-apps/seed-all-platform-agents.mjs
```

Scaffold runs `fixWebPaths` so `styles/{mcp_prefix}.css` and `use-{app-kebab}-*` hook imports resolve (see `scaffold-from-ehcs.mjs`).

## Dev troubleshooting (`Invalid response payload`)

When opening apps at `http://localhost:4091/apps/{appId}`, the iframe calls `/{appId}/consoleapi/...` on the **client** port. `packages/client/vite.config.ts` must proxy every enabled extension id to the API (`4090`). After adding extensions to `extensions.json`, restart the **client** dev server.

Newly enabled extensions also need an **API restart** so `ExtensionUpgradeOrchestrator` runs migrations and creates schemas.

## Unified MCP (`bowi-mcp`)

- **One platform MCP server** `bowi-mcp` (HTTP on `ehcs-ai`: `/ehcs-ai/consoleapi/bowi-mcp/mcp`).
- Tools: `bowi_start_full_check`, `bowi_get_check_progress`, `bowi_cancel_check`, `bowi_ingest_rule_result`, `bowi_sql_query`, `bowi_sql_execute` — every call requires `appId` (e.g. `inv-opt-ai`).
- **Table access** is enforced in the agent `rolePrompt` (数据范围) and in SQL validation inside `bowi-mcp`.
- After pull: `pnpm --filter ehcs-ai build:api`, then re-run **设置 → 更新智能体** (or `seed-all-platform-agents.mjs`) so agents bind `bowi-mcp` + ERP.

```bash
node scripts/enterprise-ai-apps/migrate-to-bowi-mcp.mjs   # platform agent services (once)
node scripts/enterprise-ai-apps/generate-agent-config.mjs
```

## Parent shell FAB (right edge)

Enterprise apps use the in-extension agent dock (top bar). The main client hides the fixed right-edge `/apps` FAB for ids listed in `packages/client/src/lib/extension-internal-agent-apps.ts` (sync when adding apps to the registry).
