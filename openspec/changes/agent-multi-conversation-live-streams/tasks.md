## 1. Registry foundation

- [x] 1.1 Add shared `ConversationChatRegistry` under `packages/client/src/pages/agents/_shared/` (`getOrCreate`, `get`, `setActive`, `dispose`, streaming count, idle eviction helpers)
- [x] 1.2 Unit-test registry: create/reuse by conversation id, dispose, concurrent streaming count, eviction of completed entries only
- [x] 1.3 Define default concurrent live-stream cap constant (4) and a pure helper that decides allow vs refuse before send

## 2. Detail chat wiring

- [x] 2.1 Refactor `use-agent-chat-stream` to bind `useChat({ chat })` from the registry for the active conversation instead of recreating via changing `useChat({ id })` on route switch
- [x] 2.2 On send/regenerate: `getOrCreate` Chat for target conversation with callbacks closed over that conversation id; register/unregister generating for that id only
- [x] 2.3 On route/focus change: update active id and rebind UI to existing registry Chat when present; do not `stop()` or dispose other Chats
- [x] 2.4 Fix finish/error paths so background streams cannot clear generating or inject errors into the focused conversation
- [x] 2.5 Enforce concurrent cap before starting a new stream; show clear user-visible error; leave existing streams running
- [x] 2.6 Prefer live registry messages over history paging overwrite while that conversation’s Chat is streaming; refetch BA after stream settles
- [x] 2.7 Do not replace a Chat that already has live messages with a history page (including late in-flight fetches); attach newer assistants with unknown parent ids to the last user instead of a second root

## 3. Site-chat parity

- [x] 3.1 Apply the same registry + focus-as-view-switch pattern in `use-public-agent-chat-stream`
- [x] 3.2 Align public assistant switch effects with detail (no stop on switch; conversation-scoped callbacks)
- [x] 3.3 Enforce the same concurrent cap and generating badge behavior on site-chat

## 4. OpenCode rehydrate

- [x] 4.1 When focusing an OpenCode conversation with server turn `running` but no streaming registry Chat, start session events (poll fallback) into that conversation’s display state without calling Stop
- [x] 4.2 On settle, refetch BuildingAI messages and clear live preview / generating consistently with detached-turn behavior
- [x] 4.3 Unit-test or lightly test the “missing Chat + running turn → rehydrate” decision helper

## 5. Verification

- [ ] 5.1 Manual: A streaming → switch to B → send on B → both Network streams stay alive; A’s Chat messages keep updating while B is focused
- [ ] 5.2 Manual: return to A mid-turn → transcript shows continuous live progress (not empty / stale BA-only)
- [ ] 5.3 Manual: background stream completes → only that conversation’s generating badge clears; focused UI unaffected
- [ ] 5.4 Manual: hit concurrent cap → new send refused with clear message; existing streams continue
- [ ] 5.5 Manual: OpenCode refresh mid-turn → refocus → live rehydrate until persist; Stop still aborts only the targeted conversation
- [x] 5.6 Run targeted client unit tests + `openspec validate agent-multi-conversation-live-streams`
