## Why

The homepage sidebar currently only displays history records from the "new conversation" (新对话) feature, which stores records in `ai_chat_record`. Conversations with AI agents (智能体), stored separately in `ai_agent_chat_record`, are completely invisible from the homepage history. This creates a fragmented experience: users must navigate into each agent's page to find their agent conversation history, and there is no unified view of all their AI interactions.

## What Changes

- Add a new unified API endpoint (`GET /ai-conversations/unified`) that merges `ai_chat_record` and `ai_agent_chat_record` records for the current user, sorted by time, excluding anonymous conversations
- Update the homepage sidebar to display both new conversations and agent conversations in the "历史记录" section, limited to 6 recent items total
- Render each agent conversation item with the agent's name as a source label, distinguishing it from direct conversations
- Clicking an agent conversation navigates to `/agents/:agentId/c/:conversationId` to open the agent's chat page with the selected conversation
- Update the "查看全部" command dialog to use the unified API, supporting search, infinite scroll, rename, and delete for both conversation types
- Agent conversations in the history list support rename (via existing PATCH API through agent context) and soft-delete

## Capabilities

### New Capabilities

- `unified-chat-history`: A unified conversation history API and UI that combines new conversations (`ai_chat_record`) and agent conversations (`ai_agent_chat_record`) into a single time-sorted list on the homepage sidebar and command dialog

### Modified Capabilities

<!-- No existing specs are modified — this is a net-new capability. -->

## Impact

- **API**: New endpoint `GET /ai-conversations/unified` in `AiChatRecordWebController`; new service method in `AiChatRecordService` querying both tables
- **Client services**: New `useUnifiedConversationsQuery` hook in `packages/@buildingai/web/services/src/web/chat.ts`
- **UI components**: `DefaultAppSidebar`, `DefaultNavMain` (sidebar history list and command dialog), `ConversationSubItem`, and `HistoryCommandItem` to support agent-type items with source labels and agent-specific navigation
- **Database**: No schema changes — uses existing `ai_chat_record`, `ai_agent_chat_record`, and `agent` tables

## Non-goals

- Does not include anonymous agent conversations (only conversations with a `userId` are shown)
- Does not change the agent detail page's own history panel (that remains per-agent)
- Does not change the console/admin conversation records view
