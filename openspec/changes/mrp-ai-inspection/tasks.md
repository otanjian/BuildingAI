## 1. Schema and entities

- [x] 1.1 Add `RunType` enum and columns on `GovernanceRun` (`runType`, `sessionTitle`, `executor`, `dataSource`, `conversationId`, `inspectionMeta`)
- [x] 1.2 Create `GovernanceRuleResult` and `GovernanceCheckDetail` entities with relations to `GovernanceRun`
- [x] 1.3 Add migration `0.x.x-ai-inspection.ts` under `extensions/erp-healthy/src/api/db/migrations/`
- [x] 1.4 Register entities in `db/entities/index.ts` and extension app module

## 2. Inspection API (extension)

- [x] 2.1 Create `inspection` module with DTOs and Zod schema matching prompt JSON contract
- [x] 2.2 Implement `POST /inspection/sessions` (start run, generate `sessionTitle`, return rule codes)
- [x] 2.3 Implement `PATCH /inspection/sessions/:runId` (bind `conversationId`)
- [x] 2.4 Implement `POST /inspection/sessions/:runId/rule-results` (upsert result + details, idempotent)
- [x] 2.5 Implement `POST /inspection/sessions/:runId/complete` (score, issueCounts, `COMPLETED`)
- [x] 2.6 Implement `GET /inspection/rule-results/:id/details` with pagination
- [x] 2.7 Add unit tests for session lifecycle and upsert logic

## 3. Dashboard service integration

- [x] 3.1 Update `DashboardService.getRulesOverview()` to read latest completed `ai_inspection` rule results
- [x] 3.2 Update `getSummary()` / `getTrend()` to include latest `ai_inspection` run where appropriate
- [x] 3.3 Expose `lastRuleResultId` on rule overview rows for drawer API

## 4. Web — prompt and session start

- [x] 4.1 Extend `build-inspection-prompt.ts` with metadata, JSON schema instructions, and tests
- [x] 4.2 Add `inspection-session.ts` service wrappers for new API endpoints
- [x] 4.3 Update `handleStart` in dashboard to call `POST /inspection/sessions` before `openStandardInspectionChat`
- [x] 4.4 Store active session in `sessionStorage` (`runId`, `sessionTitle`, rules, `startedAt`)

## 5. Web — Inspection Coordinator

- [x] 5.1 Add platform conversation client helpers using `apiHttpClient` (`list`, `get`, `patch title`)
- [x] 5.2 Implement `useInspectionCoordinator` hook (poll, discover conversation, ordered persist)
- [x] 5.3 Implement JSON extraction + Zod parse from assistant message text
- [x] 5.4 Wire coordinator on dashboard mount / after start; call complete endpoint when done
- [x] 5.5 Disable concurrent **开始检查** while run is `RUNNING`; refresh rules on complete

## 6. Web — Dashboard detail UI

- [x] 6.1 Add `RuleResultDetailDrawer` component (summary, table, pagination)
- [x] 6.2 Add double-click handler on **上次结果** column in `rules-overview-table.tsx`
- [x] 6.3 Remove primary `mergeRulesWithLocalStorage` / deprecate `ai-check-storage` for main flow

## 7. Verification and docs

- [ ] 7.1 Manual E2E: start check → MCP run → DB rows → drawer → score update (embedded `/apps/erp-healthy`)
- [x] 7.2 Run `pnpm --filter erp-healthy build:api` and extension tests
- [x] 7.3 Update `extensions/erp-healthy/README.md` with inspection persistence flow
- [x] 7.4 Align `docs/mrp-ai.md` checklist with `governance_run` field names (optional cross-reference)
