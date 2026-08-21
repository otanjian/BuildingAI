## 1. DB migration: archived_at column

- [x] 1.1 Add `archivedAt: Date | null` column to `AgentChatRecord` entity (`packages/@buildingai/db/src/entities/ai-agent-chat-record.entity.ts`)
- [x] 1.2 Generate/author TypeORM migration `ALTER TABLE ai_agent_chat_record ADD COLUMN archived_at timestamptz NULL`; run `pnpm migration:run` locally and verify column exists (`\d ai_agent_chat_record`)

## 2. Backend: archive service + API

- [x] 2.1 Add `archive(conversationId, userId, archived)` to `AgentChatRecordService` (set/clear `archivedAt`; throw notFound when record missing or belongs to another agent)
- [x] 2.2 Add `PATCH /ai-agents/:id/chat/conversations/:conversationId/archive` to `agent-chat.controller.ts` with ownership check (`record.userId === playground.id` or matching `anonymousIdentifier`), annotated `@AgentPublicAccess` consistent with existing delete endpoint
- [x] 2.3 Update `listUserConversations` to exclude `archivedAt IS NOT NULL` by default and accept `includeArchived` query param (extend `ListAgentConversationsDto`)
- [x] 2.4 Add `archiveAgentConversation` mutation to `packages/@buildingai/web/services/src/web/chat.ts` (PATCH archive endpoint) and extend `AgentChatRecordItem` with `archivedAt`
- [x] 2.5 Verify: unit/integration test or manual curl — archive own conversation returns 200 + record has `archived_at`; archive foreign conversation returns 403/404; list excludes archived unless `includeArchived=true`

## 3. Frontend: background stream (site-chat)

- [x] 3.1 In `use-public-agent-chat-stream.ts`: key `useChat({ id })` by `agentId-anon-conversationId`; remove `stop()`/`setMessages([])` from the `initialConversationId` switch effect (keep ref resets)
- [x] 3.2 Add `activeConversationRef` guard: `data-conversation-id` navigates only for visible conversation; message-id events only map ids for visible conversation
- [x] 3.3 Guard `onFinish` usage hydration to visible conversation; keep `finalizeConversationSideEffects` (list invalidation) for any completing conversation
- [x] 3.4 Create `lib/background-streams.ts` tracker (`register/unregister/isGenerating/subscribe`); call register on send, unregister in `onFinish`/`onError`/`stop`
- [x] 3.5 In `use-public-agent-assistant.ts`: derive `generatingConversationIds` via tracker subscription; pass to sidebar
- [ ] 3.6 Verify manually: start stream in conversation A → click 新对话 → A keeps streaming in background (network tab shows request alive) → switch back to A → full reply shown; no spurious navigation while B is visible

## 4. Frontend: background stream (detail page)

- [x] 4.1 In `use-agent-chat-stream.ts`: apply same `useChat` id keying, remove switch `stop()`, add `activeConversationRef` guards for navigation/message-id/usage
- [x] 4.2 Register/unregister with shared `background-streams` tracker (extract tracker to a shared location, e.g. `packages/client/src/components/ask-assistant-ui/` or `pages/agents/_shared/`)
- [x] 4.3 In `use-assistant-for-agent.ts`: pass `generatingConversationIds` into the detail page sidebar
- [ ] 4.4 Verify manually: repeat site-chat scenario on detail page; confirm no regression in edit-message / regenerate flows

## 5. Frontend: archive UI

- [x] 5.1 Site-chat sidebar (`pages/agents/site-chat/index.tsx` + `SiteChatSidebarPanel`): add hover archive button per conversation entry; call archive mutation; invalidate `public-agent-conversations` query key
- [x] 5.2 Detail sidebar (`pages/agents/detail/chat/index.tsx`): add archive action; invalidate conversations query
- [x] 5.3 Show「生成中」badge on conversation entries whose id is in `generatingConversationIds` (site-chat + detail)
- [x] 5.4 In `use-embed-conversation-resume.ts`: before resuming from `buildingai_last_conv_*`, fetch conversation; if `archivedAt` set → `clearLastConversation` and stay on first-run screen
- [ ] 5.5 Verify manually: archive from both sidebars → item disappears from list, still visible in unified history (homepage/command dialog), direct URL still opens; embed refresh skips archived conversation

## 6. Docs & PRD sync

- [x] 6.1 Update `docs/DB-EHCS-AI.md` if it documents `ai_agent_chat_record` schema (add `archived_at` row); otherwise note DB change in relevant doc — `docs/DB/DB-EHCS-AI.md` only documents the `ehcs-*` extension tables; the platform table `ai_agent_chat_record` is not covered there, so no edit needed. The authoritative record is the OpenSpec change (`openspec/changes/agent-conversation-background-stream-and-archive/`)
- [x] 6.2 Check `docs/PRD-EHCS-AI.md` §agent 会话/历史 for behavior changes (background stream + archive) and update if it describes conversation list/delete semantics — `docs/PRD/PRD-EHCS-AI.md` describes only the EHCS extension product (check rules / dashboard / settings), not platform agent conversation list/delete semantics; no edit needed. OpenSpec spec/design already describe the new behavior
- [x] 6.3 Run `pnpm typecheck` (api + client) and affected unit tests; run lint on touched packages — api `tsc --noEmit` pass, db `check-types` pass, client `tsc -p tsconfig.app.json` shows no errors in touched files (pre-existing errors elsewhere), eslint clean on all touched files
> Ownership reconciliation (2026-08-21): OpenCode background execution is
> superseded by `opencode-turn-consistency`; non-OpenCode background streams and all
> archive behavior remain owned by this change.
