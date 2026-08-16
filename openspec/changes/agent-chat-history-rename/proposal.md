## Why

Agent chat sidebars (detail chat and site/publish chat) show conversation titles but only offer archive on hover. Users can already rename non-agent conversations from the global sidebar, so agent history feels incomplete—especially when auto-generated titles are unreadable (e.g. "? ?"). Why now: users hit this gap while using agent chat daily and need parity with the existing rename flow.

## What Changes

- Add hover **重命名** and **归档** icon buttons on each agent history row
- Rename opens a dialog (same pattern as global sidebar), then persists via the existing agent conversation update API
- Apply the same interaction in agent detail chat and site-chat history lists
- Ensure successful rename refreshes the agent conversations list (not only unified homepage history)

## Non-goals

- Changing automatic title generation
- Changing global sidebar rename (already works)
- Double-click / inline title editing
- Replacing archive with hard delete

## Capabilities

### New Capabilities

- `agent-chat-history-rename`: rename conversations from agent chat history panels (detail + site-chat)

### Modified Capabilities

- （无）

## Impact

- Client: `packages/client/src/pages/agents/detail/chat/index.tsx`, `packages/client/src/pages/agents/site-chat/index.tsx`, shared `agent-history-conversation-row.tsx`
- Web services: `useUpdateAgentConversation` query invalidation for agent conversation lists
- API: expose existing title PATCH via `@AgentPublicAccess` for site-chat (`PATCH /v1/conversations/:id`)
- Existing authenticated API: `PATCH /ai-agents/:agentId/chat/conversations/:conversationId`
