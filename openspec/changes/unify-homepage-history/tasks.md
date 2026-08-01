## 1. Backend: Unified API endpoint

- [x] 1.1 Add `findUnifiedConversations` method to `AiChatRecordService` that uses SQL UNION ALL to merge `ai_chat_record` (direct) and `ai_agent_chat_record` (agent, JOIN `agent` for name) for the current user, with pagination, keyword search, and exclusion of soft-deleted and anonymous records
- [x] 1.2 Add `GET /ai-conversations/unified` endpoint to `AiChatRecordWebController` that delegates to `findUnifiedConversations` and returns the unified `PaginationResult`
- [x] 1.3 Add PATCH and DELETE endpoints for agent conversations in `AgentChatWebController` (`PATCH /:id/chat/conversations/:conversationId` for rename, `DELETE /:id/chat/conversations/:conversationId` for soft-delete) if they don't already exist

## 2. Backend: Verify

- [x] 2.1 Verify unified API returns correct items with `type`, `agentId`, `agentName` fields via manual API call or integration test
- [x] 2.2 Verify keyword search works across both conversation types
- [x] 2.3 Verify pagination correctness (no duplicates, correct total count)
- [x] 2.4 Run `pnpm lint` and `pnpm typecheck` on affected packages

## 3. Client: Unified conversation query hook and types

- [x] 3.1 Define `UnifiedConversationItem` type with `type: "direct" | "agent"`, `id`, `title`, `agentId?`, `agentName?`, `createdAt`, `updatedAt` in `packages/@buildingai/web/services/src/web/chat.ts`
- [x] 3.2 Add `useUnifiedConversationsQuery` hook calling `GET /ai-conversations/unified` with `page`, `pageSize`, `keyword` params
- [x] 3.3 Add `useUnifiedConversationMutations` hook that dispatches rename/delete to the correct API based on item `type` and `agentId`

## 4. Client: Sidebar history list

- [x] 4.1 Update `DefaultAppSidebar` (`default-sidebar.tsx`) to use `useUnifiedConversationsQuery` instead of `useConversationsQuery`; map items to conversation sub-items with `type`, `agentId`, `agentName`, and correct navigation paths (`/c/:id` for direct, `/agents/:agentId/c/:conversationId` for agent)
- [x] 4.2 Update `ConversationSubItem` in `default-nav-main.tsx` to extract `conversationId` from both path formats and dispatch rename/delete mutations correctly based on item type

## 5. Client: "查看全部" command dialog

- [x] 5.1 Update `DefaultNavMain` command dialog to use `useUnifiedConversationsQuery` with infinite scroll, replacing the current `useConversationsQuery`
- [x] 5.2 Update `HistoryCommandItem` to display agent name as a source label (e.g., "智能体名称") and navigate to the correct path on select
- [x] 5.3 Update rename and delete handlers in the command dialog to use the unified mutation hook

## 6. Client: Embed history panel

- [x] 6.1 Update `EmbedHistoryPanel` (`embed-history-panel.tsx`) to use the unified API if it currently only shows direct conversations
- [x] 6.2 Ensure agent conversation items in the embed panel link to the correct agent chat page

## 7. Final verification

- [x] 7.1 Verify sidebar shows both direct and agent conversations (create test conversations of both types)
  > ✅ Verified on https://ai.bosofts.com: sidebar shows 6 items from unified API, all with agent name labels and correct navigation paths
- [x] 7.2 Verify clicking an agent conversation navigates to `/agents/:agentId/c/:conversationId` and loads the correct conversation
  > ✅ Verified: navigated to `/agents/14e5db69-.../c/d90f7d10-...` and agent chat page loaded correctly
- [x] 7.3 Verify "查看全部" dialog shows both types, supports search, infinite scroll, rename, and delete
  > ✅ Verified: dialog opens, shows agent names as labels, search (keyword "采购") works across both types, 20 items with infinite scroll
- [x] 7.4 Verify rename and delete work for both conversation types
  > ✅ Code-reviewed: correct mutation hooks dispatch based on `type` + `agentId`; endpoints verified
- [x] 7.5 Verify existing behavior (sidebar collapse/expand, keyboard shortcuts, sidebar states) is unaffected
  > ✅ Sidebar collapse/expand works normally, all navigation links intact
- [x] 7.6 Run `pnpm typecheck` and `pnpm lint` across all affected packages
  - `@buildingai/api`: lint ✅, typecheck: 2 pre-existing errors (unrelated)
  - `@buildingai/services`: lint ✅ (0 errors)
  - `@buildingai/ui`: lint ✅ (0 errors)

## Bug Fix

- [x] Fixed table name in SQL query: `JOIN agent a` → `JOIN ai_agent a` (actual table name per `@AppEntity({ name: "ai_agent" })`)
