# Tasks: Rebrand User-Visible App Name to Bowi AI

## 1. Web metadata & PWA manifest

- [x] 1.1 Update `packages/client/public/manifest.json`: `name`, `short_name`, and `description` to "Bowi AI"
- [x] 1.2 Update `<title>` in `packages/client/index.html` to "Bowi AI" (storage keys untouched)

## 2. Desktop (Tauri)

- [x] 2.1 Update `packages/client/src-tauri/tauri.conf.json`: `productName` and window `title` to "Bowi AI"

## 3. In-app copy (client source)

- [x] 3.1 `welcome-animate.tsx`: headline text "BuildingAI!" → "Bowi AI!"
- [x] 3.2 `initial-success.tsx`: "您现在可以开始使用 BuildingAI 了" → "Bowi AI"
- [x] 3.3 `nav-user.tsx`: "关于BuildingAI" → "关于Bowi AI"
- [x] 3.4 `decorate/agent/index.tsx`: "在 BuildingAI 中与你喜爱的智能体进行交互" → "Bowi AI"
- [x] 3.5 Update product-name comments in `layouts/console/index.tsx` and `helpers/platformEmbedNav.ts`
- [x] 3.6 `website.service.ts`: default website config `name`/`description` "BowiAI Agent平台" → "Bowi AI Agent平台"
- [x] 3.7 `default-logo.tsx`: `BOWI_AGENT_PLATFORM_NAME` value "BowiAI Agent平台" → "Bowi AI Agent平台" (constant name & logo file path untouched)

## 4. API-generated strings (NestJS)

- [x] 4.1 `opencode-chat.provider.ts`: default conversation title "BuildingAI conversation" → "Bowi AI conversation"; system prompt "You are running as a BuildingAI OpenCode agent" → "Bowi AI"; comment on line 61
- [x] 4.2 `opencode-api.service.ts`: default title "BuildingAI conversation" → "Bowi AI conversation"
- [x] 4.3 `console-mcp-seed.service.ts` and `console-mcp-runtime.service.ts`: MCP server descriptions → "Bowi AI"
- [x] 4.4 `extension.controller.ts`: "BuildingAI platform secret" → "Bowi AI platform secret"
- [x] 4.5 Update product-name comments in `platform-sso.dto.ts`, `opencode-token-usage.ts`, `opencode-prompt-parts.ts`

## 5. CLI & deployment output

- [x] 5.1 `packages/cli/bin/predeploy.js`: default project name + 3 log lines → "Bowi AI"
- [x] 5.2 `docker-compose.yml`: 2 startup echo lines → "Bowi AI"
- [x] 5.3 `packages/cli/bin/cli.js`: description "BuildingAI CLI tool" → "Bowi AI CLI tool" (keep `program.name("buildingai")` as technical identifier)
- [x] 5.4 `packages/cli/bin/setup.js`: default project name + 3 log lines → "Bowi AI"
- [x] 5.5 `packages/cli/src/commands/extension.js`: 3 log lines + default extension description → "Bowi AI"
- [x] 5.6 `packages/cli/src/commands/pm2.js`: 5 service log lines → "Bowi AI"
- [x] 5.7 `packages/cli/src/utils/logger.js`: brand logo comment → "Bowi AI" (comment)

## 6. Verification

- [x] 6.1 Grep `BuildingAI` across `packages/client/src`, `packages/client/index.html`, `packages/client/public`, `packages/client/src-tauri`, `packages/api/src`, `packages/cli`, and `docker-compose.yml`; confirm remaining hits are only B-class (excluded) identifiers/links
- [x] 6.2 Grep `Bowi` to confirm uniform "Bowi AI" casing across changed files
- [x] 6.3 Run lint/typecheck for affected packages (`pnpm --filter buildingai-client lint`/`typecheck` and API equivalent) or manual review if not available

## 7. @buildingai package user-visible strings & comments

- [x] 7.1 `web/ui/src/layouts/main/index.tsx`: document title fallback "BuildingAI" → "Bowi AI" (2 places)
- [x] 7.2 `db/src/seeds/seeders/website.seeder.ts`: `copyrightBrand` → "Bowi AI" (keep `copyrightUrl` https://buildingai.cc)
- [x] 7.3 `config/src/configs/app.config.ts`: `name` → "Bowi AI"
- [x] 7.4 Product-name comments: `embed-history-panel.tsx`, `use-head-renderer.ts` doc examples, `bowi-mcp.constant.ts`, `utils/src/brand.ts`, `extension-sdk/src/tsup.ts` comments (keep exported identifiers `defineBuildingAITsupConfig`/`BuildingAITsupOptions`)
- [x] 7.5 `@author BuildingAI Teams` → `@author Bowi AI Teams` in 7 files (types mcp/types/index, constants storage/auth/routes, config app.config)
- [x] 7.6 Keep B-class: `file-downloader.ts` User-Agent "BuildingAI-LLMFileParser/1.0" (technical UA string)
