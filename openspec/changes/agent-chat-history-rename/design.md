## Context

See `proposal.md` for motivation. Global sidebar already renames agent and direct conversations via `useUpdateAgentConversation` / `useUpdateConversation` and a dialog. Agent detail chat (`AgentInfoPanel`) and site-chat history rows only expose a hover archive button. The update mutation currently invalidates `unified-conversations` but not `["agents", "chat", "conversations"]`, so an agent-panel rename would not refresh the local list even if the UI called it.

## Goals / Non-Goals

**Goals:**
- Match global-sidebar overflow + dialog rename UX inside agent history panels
- Keep archive in the same overflow menu
- Fix mutation cache invalidation so agent conversation queries refresh after rename

**Non-Goals:**
- Extract a shared HistoryRow package across layouts in this change (optional follow-up)
- Change archive API semantics or soft-delete
- Touch title auto-generation prompts

## Decisions

1. **Reuse existing PATCH + hook**  
   Call `useUpdateAgentConversation` (already maps to `PATCH /ai-agents/:agentId/chat/conversations/:id`).  
   Alternative: local-only title edit — rejected; must persist.

2. **Hover icon pair: rename + archive**  
   On row hover, show PenLine (重命名) and Archive (归档) icon buttons. Rename still opens a dialog.  
   Alternative considered earlier: `···` overflow menu (aligned with global sidebar) — superseded by product preference for two direct icons.

3. **Apply in both detail chat and site-chat**  
   Duplicate the small UI pattern in both files rather than extracting a shared component now, to keep the change small and local.  
   Alternative: shared component — deferred unless duplication becomes painful during implementation.

4. **Invalidate agent conversation queries on rename success**  
   Add `queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] })` beside the existing unified invalidation in `useUpdateAgentConversation`, mirroring `useArchiveAgentConversation`.

5. **Expose title update on public agent API for site-chat**  
   Add `@AgentPublicAccess` (PATCH `conversations/:conversationId`) to the existing `updateConversation` endpoint, with anonymous-identifier checks matching archive. Site-chat calls `PATCH /v1/conversations/:id` via `updatePublicConversationTitle`.

6. **Shared history row in client**  
   Use `AgentHistoryConversationRow` under `pages/agents/_shared/` for detail + site-chat to keep menu/dialog behavior identical without a package-level abstraction.

## Risks / Trade-offs

- [Risk] Duplicated menu/dialog markup in two pages → Mitigation: keep logic thin; extract later if a third consumer appears  
- [Risk] Menu overlap with streaming spinner on the row → Mitigation: reserve right padding on hover like current archive button; hide spinner or keep menu trigger always reachable  
- [Risk] Optimistic UI lag if only invalidate → Mitigation: invalidate is enough for current archive flow; match that unless UX feels slow

## Migration Plan

- Deploy API (public PATCH title alias) with client UI + services invalidation fix
- No DB migration
- Rollback: revert UI + public-access decorator; authenticated title PATCH remains