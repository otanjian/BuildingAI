## 11. Documentation sync (V1.1.1)

- [x] 11.1 Update `docs/PRD-EHCS-AI.md` (agent dock, rule-table batch, settings, layout)
- [x] 11.2 Update `openspec/specs/ehcs-ai-{dashboard-ui,platform-chat,settings,extension-scaffold}.md`
- [x] 11.3 Annotate `docs/UI-EHCS-AI.html` prototype vs implementation
- [x] 11.4 Add implementation sync note to `openspec/changes/archive/2026-05-24-ehcs-ai-v1/design.md`

## 1. Scaffold and registration

- [x] 1.1 Copy `templates/extension-starter` to `extensions/ehcs-ai`; set `manifest.json` (identifier `ehcs-ai`, name EHCS-AI)
- [x] 1.2 Wire `package.json` workspace name `ehcs-ai`, build scripts, `tsup` + `vite` configs
- [x] 1.3 Register extension in `extensions.json` (`applications.ehcs-ai.enabled: true`)
- [x] 1.4 Define `routes.tsx`: index → dashboard, `/dashboard`, `/rules`, `/anomalies`, `/settings`
- [x] 1.5 Add `EhcsLayout` (sidebar + topbar) styled per `docs/UI-EHCS-AI.html`
- [x] 1.6 Verify dev: `pnpm --filter ehcs-ai dev` and open `/extension/ehcs-ai`

## 2. Data model and migrations

- [x] 2.1 Add entities: `CheckRule`, `CheckResult`, `CheckRun`, `CheckRunItem`, `AppSettings` with `@ExtensionEntity`
- [x] 2.2 Create initial migration for schema `ehcs_ai`
- [x] 2.3 Implement seeder for PRD §九 sample rules and anomalies
- [x] 2.4 Register entities/modules in `src/api/modules/app.module.ts`
- [x] 2.5 Run migration locally; confirm tables in `ehcs_ai`

## 3. Settings API and page

- [x] 3.1 Implement `SettingsModule`: GET/PUT `app_settings` (`modelId`, `mcpServerIds`)
- [x] 3.2 Build settings page: load platform model list + MCP server list (platform web API)
- [x] 3.3 Block or warn on dashboard when `modelId` missing
- [x] 3.4 Manual test: save settings and reload

## 4. Rules API and UI

- [x] 4.1 Implement `RulesModule`: list, create, update, toggle, validation (score 1–100)
- [x] 4.2 Add `consoleHttpClient` service wrappers in `src/web/services`
- [x] 4.3 Build rules page + `RuleEditModal` (fields per PRD §3.2.2)
- [x] 4.4 Manual test: add/edit/toggle rules; counts reflect on dashboard summary

## 5. Anomalies and dashboard APIs

- [x] 5.1 Implement `AnomaliesModule`: list with risk/status filters
- [x] 5.2 Implement `DashboardModule`: summary, trend (7d), recent (limit 5)
- [x] 5.3 Implement health score and auto-fix rate per PRD formula
- [x] 5.4 Manual test: filters on anomalies page; summary numbers match DB

## 6. Check run and ingest

- [x] 6.1 Implement `CheckRunsModule`: start run, get progress, cancel, concurrent guard
- [x] 6.2 Implement ingest endpoint with Zod schema for PRD §5.1 JSON extraction
- [x] 6.3 Map ingest to `check_results`; handle pass (empty anomalies) and parse failure
- [x] 6.4 Unit tests for JSON parser (fenced code, invalid JSON, multi-anomaly)
- [x] 6.5 Manual test: ingest sample assistant payloads via API or curl

## 7. Platform chat client

- [x] 7.1 Add `platform-chat.ts`: `usePlatformChat` with `@ai-sdk/react` → `/api/ai-chat`
- [x] 7.2 Load `modelId` / `mcpServerIds` from settings into chat transport body
- [x] 7.3 Add `buildCheckPrompt(rule)` requiring structured JSON output
- [x] 7.4 Spike: one rule stream end-to-end in isolation (browser network tab)

## 8. Dashboard UI and batch check

- [x] 8.1 Build dashboard left: stat cards, mini bar chart, recent anomalies table
- [x] 8.2 Build `ChatPanel` (right 30%): messages, input, AI 自动检查 button
- [x] 8.3 Implement `useBatchCheck`: POST check-run → loop enabled rules → stream → ingest
- [x] 8.4 Disable duplicate runs while `running`; show per-rule progress in chat
- [x] 8.5 Refresh dashboard APIs after each ingest and on completion
- [x] 8.6 Handle chat command「开始检查」same as button

## 9. Anomalies page and RCA modal

- [x] 9.1 Build anomalies table with risk badges and filters
- [x] 9.2 Build `RcaModal` with dedicated `usePlatformChat` instance
- [x] 9.3 POST RCA session endpoint (optional `conversationId` storage)
- [x] 9.4 Stream RCA on open; support user follow-up; new session each open (V1.1)
- [x] 9.5 Manual test: RCA on `ANOM-20260524-001` shows streaming text

## 10. Verification and docs

- [x] 10.1 Run `pnpm --filter ehcs-ai lint` and `check-types`
- [x] 10.2 Run `pnpm --filter ehcs-ai build:publish`
- [x] 10.3 Walk PRD §八 acceptance checklist (dashboard, rules, anomalies, agent contract)
- [x] 10.4 Add `extensions/ehcs-ai/README.md`: entry URL `/extension/ehcs-ai`, env prerequisites (model + MCP in admin)
