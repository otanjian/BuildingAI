# Proposal: Rebrand User-Visible App Name to Bowi AI

## Why

The product is being rebranded from **BuildingAI** to **Bowi AI**. Today the user-visible
product name ("BuildingAI") is hardcoded across the web app, PWA install metadata, desktop
(Tauri) configuration, in-app copy, API-generated default titles/descriptions, CLI output,
and code comments. The new brand name must be shown consistently everywhere a user sees the
product name, without touching internal technical identifiers.

## What Changes

- Web app `<title>` becomes "Bowi AI" (browser tab + iOS home-screen fallback name).
- PWA `manifest.json` `name` / `short_name` / `description` become "Bowi AI" (Android home-screen label).
- Tauri desktop app `productName` and window title become "Bowi AI".
- In-app user-facing copy switched from "BuildingAI" to "Bowi AI":
  - Install flow (welcome headline, initial-success message, about dialog, agent decorate copy).
- API-generated user-visible strings switched:
  - Default OpenCode conversation titles ("BuildingAI conversation" → "Bowi AI conversation").
  - OpenCode system prompt line and console MCP server descriptions.
- CLI predeploy output and docker-compose deployment log lines use "Bowi AI".
- Code comments mentioning "BuildingAI" product name updated to "Bowi AI".

## Capabilities

### New Capabilities
- `app-identity`: The product's user-visible name is **Bowi AI** — enforced across web
  metadata (title, PWA manifest), desktop window config, in-app copy, API-generated default
  titles/descriptions, and CLI/deployment output.

### Modified Capabilities
<!-- None. No existing spec governs the product display name. -->

## Impact

- **Client web**: `packages/client/index.html`, `packages/client/public/manifest.json`.
- **Client desktop**: `packages/client/src-tauri/tauri.conf.json`.
- **Client source copy**: install pages, about dialog, decorate copy, comments.
- **API**: OpenCode provider/service/prompt parts, console MCP seed/runtime, extension
  controller, auth/platform SSO comments.
- **CLI/deploy**: `packages/cli/bin/predeploy.js`, `docker-compose.yml`.
- **NOT changed (non-goals)**: `@buildingai/*` package names, `buildingai-client` name,
  localStorage keys (`buildingai-client-theme*`), JWT dev secret (`auth.module.ts`),
  Tauri bundle identifier (`cc.buildingai.client`), Cargo crate name, GitHub links,
  extension LICENSE texts, README/install docs, and built artifacts under `public/web`.
