## Context

The homepage currently has two independent conversation systems:
- **Direct conversations** (`ai_chat_record` table): accessed via `/c/:id`, API at `GET /ai-conversations`, used for new conversations from the chat page.
- **Agent conversations** (`ai_agent_chat_record` table): accessed via `/agents/:agentId/c/:conversationId`, API at `GET /ai-agents/:agentId/chat/conversations`.

The homepage sidebar's "历史记录" section (`DefaultAppSidebar` → `DefaultNavMain`) only fetches from the direct conversation API. The agent conversation API requires an `agentId` parameter, making it impossible to fetch all agent conversations in a single request.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a single API endpoint that merges both conversation types for the current user
- Update the sidebar and "查看全部" dialog to consume the unified API
- Support rename and delete for both conversation types through the unified UI
- Show agent name as a source label on agent conversation items

**Non-Goals:**
- No new database tables or schema changes
- No changes to the agent detail page's own history panel
- No changes to console/admin conversation management
- No inclusion of anonymous agent conversations

## Decisions

### Decision 1: New unified API endpoint on the existing controller

**Choice:** Add `GET /ai-conversations/unified` to `AiChatRecordWebController`, with a new `findUnifiedConversations` method in `AiChatRecordService`.

**Rationale:** The `AiChatRecordService` already has `InjectRepository(AiChatRecord)`. The new method will also inject `AgentChatRecord` and `Agent` repositories to JOIN agent names. This keeps the unified endpoint co-located with the existing direct conversation API.

**Alternatives considered:**
- *New standalone controller*: Overkill for a single endpoint; adds routing complexity.
- *Frontend-only merge (two parallel requests)*: Would require fetching ALL agent conversations per-agent (N requests), which doesn't scale. The API-level merge with SQL is more efficient.

### Decision 2: SQL UNION ALL for server-side merge

**Choice:** Use TypeORM QueryBuilder with manual SQL UNION ALL to merge `ai_chat_record` and `ai_agent_chat_record`, then apply ORDER BY and LIMIT/OFFSET on the combined result.

**Rationale:**
- Single query, correct pagination (no client-side merge of two paginated sets)
- Both tables have `(userId, createdAt)` indexes, so individual queries are fast
- UNION ALL (not UNION) since there's no deduplication concern between the two tables

**Query structure:**
```sql
SELECT id, title, 'direct' AS type, NULL AS agent_id, NULL AS agent_name, created_at, updated_at
FROM ai_chat_record
WHERE user_id = :userId AND is_deleted = false

UNION ALL

SELECT r.id, r.title, 'agent' AS type, r.agent_id, a.name AS agent_name, r.created_at, r.updated_at
FROM ai_agent_chat_record r
JOIN agent a ON a.id = r.agent_id
WHERE r.user_id = :userId AND r.is_deleted = false AND r.anonymous_identifier IS NULL

ORDER BY updated_at DESC
LIMIT :limit OFFSET :offset
```

**Alternatives considered:**
- *Two separate queries + in-memory merge*: Pagination becomes incorrect unless we overfetch; harder to implement infinite scroll correctly.
- *Create a materialized view*: Unnecessary complexity for this use case; no real-time requirements.

### Decision 3: Unified item type with discriminator

**Choice:** Each item in the unified response has a `type` field: `"direct"` or `"agent"`. Agent items additionally carry `agentId` and `agentName`.

**Rationale:** The frontend needs to:
- Render different source labels (agent name for agent items)
- Navigate to different routes (`/c/:id` vs `/agents/:agentId/c/:conversationId`)
- Call different APIs for rename/delete

A discriminator field keeps the response self-describing without nested polymorphic structures.

### Decision 4: Rename and delete remain on existing APIs

**Choice:** The unified history UI calls the existing PATCH/DELETE endpoints for each conversation type:
- Direct: `PATCH /ai-conversations/:id`, `DELETE /ai-conversations/:id`
- Agent: `PATCH /ai-agents/:agentId/chat/conversations/:id` (or equivalent), `DELETE` via `AgentChatRecordService.softDelete`

**Rationale:** The unified API is read-only for listing. Mutations go through existing endpoints to avoid duplicating authorization and business logic. The unified item carries enough info (`type`, `agentId`) for the frontend to dispatch to the correct mutation.

### Decision 5: Sidebar shows 6 items, not per-type allocation

**Choice:** The sidebar fetches `{ page: 1, pageSize: 6 }` from the unified API. No guaranteed allocation between types.

**Rationale:** Simpler API contract. Since items are sorted by `updatedAt`, the most recently active conversations (of either type) naturally surface. This aligns with the user's mental model of "what was I working on recently."

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| UNION ALL query performance degrades with very large conversation counts | Both tables have `(userId, createdAt)` indexes; typical users have hundreds, not millions, of conversations |
| Agent name may be stale if the agent is renamed after conversations are created | Acceptable trade-off; agent name is JOINed at query time via `agent` table |
| Different rename/delete APIs for the two types introduce frontend branching | Encapsulated in a single `useUnifiedConversationMutation` hook that dispatches based on item type |
| Agent conversations may lack a dedicated rename API (current agent API is per-agent) | Verify existence and add a `PATCH /ai-agents/:agentId/chat/conversations/:id` endpoint if missing |
