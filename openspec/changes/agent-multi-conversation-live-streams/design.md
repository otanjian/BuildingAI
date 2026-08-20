## Context

See proposal.md for motivation. Today detail and site-chat each hold one `@ai-sdk/react` `useChat` binding keyed by route conversation id. Switching conversations changes `id` → AI SDK constructs a new `Chat`, orphans the previous instance, and the UI only subscribes to the focused Chat. Background-stream work already avoids calling `stop()` on switch; detached-turn keeps OpenCode server turns alive and adds focused-only OC SSE/poll. The remaining gap is **client-side retention of live message state per conversation** so parallel turns remain visible when refocused (and keep applying deltas while unfocused).

Constraints:

- `@ai-sdk/react` `useChat` accepts an external `chat` instance (`useChat({ chat })`).
- Browser HTTP/1.1 connection limits (~6 per origin) constrain concurrent SSE/fetch streams.
- BuildingAI remains persistence SoT; OpenCode session mapping stays 1:1 per conversation.
- Apply to both `use-agent-chat-stream` and `use-public-agent-chat-stream`.

## Goals / Non-Goals

**Goals:**

- Introduce a module-level (or agent-scoped) **ConversationChatRegistry** mapping `conversationId → Chat` (+ metadata: status, abort ownership, generating).
- Focus change updates `activeConversationId` and rebinds the UI to the registry entry — **no destroy for switch alone**.
- Each registry Chat keeps its own transport request and callbacks closed over **that** conversation id (fix `callbacksRef` / `chatSessionKey` mis-attribution).
- Enforce a configurable concurrent live-stream cap (default 4).
- OpenCode: if focus hits a `running` turn with no registry Chat, create/attach via existing `opencode-session/events` (or poll) into that conversation’s display state until BA persist completes.
- Keep sidebar generating badges driven by registry + server `opencodeTurnStatus`, not focused key alone.

**Non-Goals:**

- Split-view multi-transcript UI.
- Server API redesign or shared multi-instance turn runner.
- Changing Stop / timeout / recover semantics from `opencode-detached-turn`.

## Decisions

### D1: Registry of AI SDK `Chat` instances (Approach A)

- **Choice:** `ConversationChatRegistry.getOrCreate(conversationId, factory)` returns a long-lived `Chat` from `@ai-sdk/react` / `ai`. UI uses `useChat({ chat: registry.get(activeId) })` (or equivalent subscription to the active Chat).
- **Why:** Reuses UIMessage stream parsing, tool parts, and send/stop APIs; matches existing DefaultChatTransport.
- **Alternatives:** Per-conversation message store + manual SSE fan-in (more control, more duplication); multi-pane components (product change). Rejected for MVP.

### D2: Focus ≠ lifecycle

- **Choice:** Route/`conversationId` changes only set `activeConversationId`. Do not change Chat identity via `useChat({ id: ... })` recreation for switches. Dispose a Chat only when: stream finished + idle grace, user Stop on that conversation, registry eviction under cap, or page unmount policy.
- **Why:** Recreating on `id` change is the root cause of “stream stops” in the UI.
- **Alternatives:** Keep recreate + improve re-focus poll only — insufficient for continuous background apply.

### D3: Callbacks close over conversation id at Chat creation

- **Choice:** When creating a Chat, bind `onData` / `onFinish` / `onError` with a fixed `conversationId` (and register/unregister `background-streams` for that id). Never key lifecycle off the currently focused `chatSessionKey`.
- **Why:** Shared `callbacksRef` + current key causes background finish/error to touch the wrong conversation.
- **Alternatives:** Single global callback with event.conversationId — still need stable ownership map; per-Chat closure is simpler.

### D4: Shared transport, per-request abort

- **Choice:** One `DefaultChatTransport` per agent page (as today) shared by registry Chats; each Chat’s `activeResponse.abortController` remains per-request. `stop()` only on the active conversation’s Chat when the user clicks Stop (existing stop API for OpenCode).
- **Why:** Transport is already request-scoped with `abortSignal`; sharing avoids N transport configs.
- **Alternatives:** Transport per Chat — unnecessary.

### D5: Concurrent cap = 4 (configurable constant)

- **Choice:** Default max 4 simultaneous streaming Chats per agent page. On send that would exceed: toast/error and do not start; do not stop others. Prefer evicting only **completed** idle Chats before refusing.
- **Why:** Stays under typical 6-connection browser budget with room for OC events + API calls.
- **Alternatives:** Cap 2 (too tight for “multi-task”); unlimited (risk stalls).

### D6: OpenCode missing-Chat rehydrate

- **Choice:** If `active` conversation has `opencodeTurnStatus === running` (or server equivalent) and no streaming registry Chat, subscribe to existing `opencode-session/events` (poll fallback) and apply `buildOpencodeLivePreview` into that conversation’s messages until settle, then refetch BA messages. Optionally create a placeholder Chat/store entry keyed by conversation id for display consistency.
- **Why:** Refresh / remount drops in-memory Chats while server turn continues (detached-turn).
- **Alternatives:** Only refetch BA — empty mid-turn UX.

### D7: Parity detail + site-chat

- **Choice:** Shared registry helper under `packages/client/src/pages/agents/_shared/` used by both stream hooks.
- **Why:** Same bug class on both surfaces; background-stream already mirrored both.

### D8: Relationship to prior changes

- **Supersedes non-goal** in `agent-conversation-background-stream-and-archive` (“no multi-conversation live display”).
- **Builds on** `opencode-detached-turn` server runner + session events; moves live apply from “focused only” to “all registry / rehydrated running conversations” as needed for the active UX (background Chats apply via their own HTTP stream; OC rehydrate at least for focused-after-refresh, optionally for all running if product wants sidebar previews later).

## Risks / Trade-offs

- [Memory: many Chat instances] → Evict completed Chats after short grace; cap concurrent streaming.
- [Connection exhaustion] → Hard cap + clear error; prefer HTTP/2 where available.
- [History load races with live Chat] → Skip history-page replace while the focused Chat already has live messages (including late in-flight fetches). Attach newer assistants with unknown parent ids to the last user rather than creating a second root. Merge/refetch persisted history after the stream completes.
- [React Strict Mode double mount] → Registry must be module-scoped or agent-scoped singleton, not recreated per hook instance.
- [Multi-tab same conversation] → Out of scope; last writer wins on persist as today.

## Migration Plan

1. Land registry behind same routes; behavior change is client-only.
2. No DB migration.
3. Rollback: revert client hooks to id-keyed `useChat` (previous background-stream behavior).

## Open Questions

- Exact default cap (4 vs 3) — start at 4; tune after manual multi-stream test.
- Whether sidebar should show a one-line live snippet for background conversations (nice-to-have; not required for MVP).
