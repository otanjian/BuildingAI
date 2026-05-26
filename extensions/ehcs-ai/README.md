# EHCS-AI Extension

ERP data health autonomous system (EHCS-AI) for BuildingAI.

## Entry URL

- **Sidebar (recommended):** `/apps/ehcs-ai` — loads extension UI in the platform app shell
- **Direct extension:** `/extension/ehcs-ai` (dev, client port with Vite proxy)
- Routes: `/dashboard`, `/rules`, `/anomalies`, `/settings`

## Register and manage on the platform

1. Ensure `extensions/extensions.json` has `applications.ehcs-ai.enabled: true`
2. Sync into the database and sidebar menu:

   ```bash
   pnpm extension:sync
   ```

3. **Console → Extensions** (`/console/extension`): enable/disable, open manage URL, upgrade, or remove
4. **Layout → Menu** (decorate): sidebar item is added under **应用** for enabled application extensions
5. Re-run DB seed if you need the default menu from `web-menu.json` on a fresh install

## Prerequisites

1. BuildingAI API + client running (`./start.sh` or `pnpm dev`)
2. PostgreSQL configured in `.env`
3. Extension enabled in `extensions/extensions.json` (`ehcs-ai`) and synced (`extension:sync`)
4. Platform admin: at least one **active LLM model** and **MCP server** configured
5. In EHCS **Settings**, select the platform **Agent** (model and MCP are configured on the agent)

### Seed EHCS platform agent

On first extension install, `EhcsPlatformAgentSeeder` creates **EHCS数据健康自治** (role, rules, opening per PRD) and links it in app settings.

For an existing install, open **EHCS → 设置** and click **创建 EHCS 智能体** (creates under your login, per PRD).

Requires at least one active **LLM model** and one **enabled MCP server** in the console (prefers names containing `erpnext` / `erp`).

> If the agent was seeded earlier but not visible: it was owned by another user. Use **创建 EHCS 智能体** to re-assign or create it for your account.

## Development

`/apps/ehcs-ai` and proxied `/extension/ehcs-ai` on port **4091** serve the extension from **`extensions/ehcs-ai/.output/public`** (production build), not `src/web` directly.

After **web UI changes**, rebuild (or use watch):

```bash
pnpm --filter ehcs-ai build:web
# or keep .output in sync while coding:
pnpm --filter ehcs-ai build:web:watch
```

Then hard-refresh the browser (`Cmd+Shift+R`).

**Live HMR (optional):** run the extension Vite dev server and use the client proxy:

```bash
pnpm --filter ehcs-ai dev:web   # http://localhost:5174/extension/ehcs-ai
# in another terminal: ./start.sh restart dev
```

Open `http://localhost:4091/apps/ehcs-ai` — Vite proxies `/extension/ehcs-ai` to :5174 when that server is running.

Full extension API + web dev:

```bash
pnpm install
pnpm --filter ehcs-ai dev
```

## Build

```bash
pnpm --filter ehcs-ai build:publish
```

## Architecture notes

- Business data in schema `ehcs_ai` (rules, anomalies, check runs); table reference: `docs/DB-EHCS-AI.md`
- AI checks stream via platform `POST /api/ai-agents/:agentId/chat/stream`
- **Full check:** user sends「开始检查」in the right agent dock → `GET /rules` (enabled) → `POST /check-runs` → per-rule agent stream → `ingest`
- One `check_run` per batch; **one conversation per rule** during batch
- UI: top nav + full-width dashboard; **🤖 FAB** opens right embedded agent panel (not floating iframe)
- Opens from `/apps/ehcs-ai` (iframe → `/extension/ehcs-ai`); platform shell chat is disabled on ehcs routes
- Product spec: `docs/PRD-EHCS-AI.md` (V1.1.1); UI prototype `docs/UI-EHCS-AI.html` is reference-only

## Agent profile

Role prompt, opening, and suggested questions live in `src/api/db/seed-data/ehcs-platform-agent.config.ts`. Re-apply via **设置 → 创建/更新 EHCS 智能体** after prompt changes.
