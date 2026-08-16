## 1. Cache invalidation

- [x] 1.1 Update `useUpdateAgentConversation` to also invalidate `["agents", "chat", "conversations"]` on success (mirror archive mutation)
- [x] 1.2 Verify rename from any caller refreshes both unified history and agent conversation lists

## 2. Agent detail chat history UI

- [x] 2.1 Replace hover archive-only control with `···` overflow menu (重命名 + 归档) on each history row in `AgentInfoPanel`
- [x] 2.2 Wire rename dialog (prefill, empty disabled, confirm via `useUpdateAgentConversation`, cancel/unchanged no-op)
- [x] 2.3 Keep archive behavior identical when chosen from the menu (including loading state)

## 3. Site-chat history parity

- [x] 3.1 Apply the same overflow menu + rename dialog + archive wiring in `site-chat` history list
- [x] 3.2 Confirm mobile/desktop entry points that share the list get the new controls

## 4. Verification

- [ ] 4.1 Manually verify: rename updates title in agent detail sidebar and survives refresh
- [x] 4.2 Empty title cannot submit — covered by `shouldCommitConversationRename` unit tests; archive wiring preserved in shared row
- [x] 4.3 Run relevant typecheck/lint for touched packages
