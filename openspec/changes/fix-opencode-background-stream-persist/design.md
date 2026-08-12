## Context

See proposal.md for motivation. Background streaming already keys `useChat({ id })` by conversation and uses a module-level `background-streams` Set for the sidebar spinner (`packages/client/src/pages/agents/_shared/background-streams.ts`). Both site-chat and detail hooks still share one `streamTargetConversationIdRef` that every `data-conversation-id` overwrites; `onFinish`/`onError` unregister that ref’s value, so concurrent streams clear the wrong id.

OpenCode `OpencodeChatProvider.streamChat` writes UI `finish` before `saveMessages`. Reopen loads only from BuildingAI via message paging when the chat instance is empty and not streaming—so finish-before-persist races produce missing latest turns. BuildingAI remains source of truth; OpenCode holds only `metadata.opencodeSessionId`.

## Goals / Non-Goals

**Goals:**

- Per-stream unregister of generating state (site-chat + detail).
- OpenCode: persist user+assistant before client-visible finish; early user persist for mid-turn reopen.
- If the finished stream’s conversation is currently visible, refetch messages after unregister.

**Non-Goals:**

- OpenCode history sync/repair tooling.
- Server-side generating flag.
- Changing Dify/Coze/native persist order (OpenCode only unless a tiny shared helper is extracted without behavior change).

## Decisions

### D1: Capture stream conversation id for unregister (do not trust shared ref)

**Update (root cause):** `@ai-sdk/react` `useChat` stores callbacks in a single `callbacksRef` updated every render. Every Chat instance’s `onFinish`/`onData` redirects to the *latest* callbacks. After switching conversations, a background stream’s `onFinish` runs with the *current* `chatSessionKey`, so map lookups by session key miss the finished conversation and the generating badge sticks.

**Fix:** Server emits transient `data-stream-complete` with the BuildingAI `conversationId` before `finish`. Client `onData` unregisters using that payload id (identity is in the event, not the session key). Only bind `streamOwnerBySessionRef` / `streamTargetConversationIdRef` when `isActiveStream` is true.

**Alternative considered:** Server `isGenerating` — rejected; badge is client UX for in-flight HTTP streams.

### D2: OpenCode persist order — save then finish

In `opencode-chat.provider.ts`, after the turn settles (`session.idle` / error / abort path) and assistant content is assembled:

1. Persist user message (if not already saved at turn start) + assistant message + stats/metadata needed for history.
2. Then write `finish-step` / `finish` (and any post-persist usage events that must remain after save—keep billing/usage consistent with current product rules; prefer completing `saveMessages` before `finish` so client `onFinish` implies DB rows exist).

**Alternative considered:** Keep finish-first and only refetch on client — insufficient alone; mid-race reopen still empty until refetch, and spinner can clear while DB empty.

### D3: Early user message persist

At OpenCode turn start (after local conversation id is known, before or right after `prompt_async`), `createMessage` for the user turn and emit `data-user-message-id`. Assistant still saved at end. Regenerate paths keep existing parent-id semantics.

**Alternative considered:** Sync from OpenCode on reopen — out of scope; conflicts with BuildingAI-as-SoT.

### D4: Refetch messages when finished stream matches visible conversation

On successful `onFinish` (and optionally after error if partial user was saved): if `finishedConversationId === activeConversationIdRef.current`, trigger the same message fetch used by paging (`getPublicConversationMessages` / detail equivalent) and `setMessages` with server items (merge/replace consistent with paging hooks). Still invalidate conversation list as today.

## Risks / Trade-offs

- [finish delayed until save] → Spinner stays until DB write completes; acceptable and matches user expectation that “done” means history is safe.
- [early user message + failed assistant] → User turn remains in history without assistant; preferable to total loss; error path should still unregister indicator.
- [AI SDK Chat instance reuse when returning to same id] → Refetch-on-finish and persist-before-finish cover empty DB race; avoid clearing messages on switch-back when status is still streaming.
- [duplicate user rows if early save + end save both create user] → End path must skip user create when already saved this turn (track saved user message id).

## Migration Plan

1. Deploy API OpenCode persist-order + early user save (backward compatible).
2. Deploy client indicator + refetch fixes (safe with old API; best with new API).
3. Rollback: revert provider + two hooks; no DB migration.

## Open Questions

None — both confirmed repros map to D1–D4.
