## Why

OpenCode-linked agents show two related reliability failures after background-stream work: reopening a conversation can miss the latest turns (sidebar row still exists), and switching to a new chat can leave a stuck “generating” spinner on the previous title. Users cannot trust history or stream status. Fix both in one change now, while the repro is confirmed and the background-stream change’s manual verification tasks are still open.

## What Changes

- Clear the sidebar generating indicator per stream: unregister the conversation that actually finished, not a shared mutable “latest stream” id (fixes stuck spinner after switch).
- Persist OpenCode turn messages to BuildingAI **before** the client stream `finish` event so reopen/load-from-DB sees the latest user and assistant content.
- Optionally persist the user message at turn start so mid-stream reopen is not empty.
- When a background stream finishes for the conversation the user is currently viewing, refetch that conversation’s messages so a premature empty load is healed without a full page refresh.

## Non-goals

- No OpenCode → BuildingAI full history sync or automated consistency repair tool.
- No server-side `isGenerating` column; generating badge stays client-tracked.
- No change to Dify/Coze/native persist ordering unless shared helpers are reused without behavior change.
- No archive / unified-history behavior changes.

## Capabilities

### New Capabilities

- `agent-background-stream-indicator`: Sidebar “generating” badge must track each in-flight conversation independently and clear when that conversation’s stream ends (site-chat and detail).
- `opencode-turn-message-persist`: OpenCode agent turns must persist BuildingAI messages before the stream is marked finished, so reopen shows the latest rounds from BuildingAI storage.

### Modified Capabilities

- (none in `openspec/specs/`; background-stream and OpenCode chat deltas live in other in-progress changes—this change adds focused fix capabilities rather than rewriting those drafts)

## Impact

- API: `packages/api/src/modules/ai/agents/providers/opencode-chat.provider.ts` (persist order / early user save).
- Client: `use-public-agent-chat-stream.ts`, `use-agent-chat-stream.ts`, and related assistant/paging hooks for refetch-on-finish; shared `background-streams` usage unchanged at module API level.
- Surfaces: OpenCode agent site-chat and detail chat sidebars + message pane.
- Related in-progress changes: complements `agent-conversation-background-stream-and-archive` (closes gaps left by unchecked manual verify tasks).
