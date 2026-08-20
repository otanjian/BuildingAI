## 1. Server turn runner skeleton

- [x] 1.1 Add an injectable OpenCode turn runner service (per-`conversationId` registry) that can start, subscribe, cancel, and report status without tying lifetime to a single HTTP response
- [x] 1.2 Persist lightweight turn status on the conversation (`metadata.opencodeTurnStatus` + timestamps, or equivalent) and clear/update it when the runner settles
- [x] 1.3 Enforce one active turn per conversation: reject overlapping sends with a clear error while status is `running`

## 2. Detach provider from passive HTTP abort

- [x] 2.1 Refactor `OpencodeChatProvider` so event listen + `prompt_async` + assemble + `saveMessages` run inside the turn runner (keep early user persist and persist-before-finish for live subscribers)
- [x] 2.2 Change agent chat controller / stream wiring so `req`/`res` close unsubscribes the client writer only and does **not** cancel the runner or call `abortSession`
- [x] 2.3 Add explicit stop API (or equivalent abort intent) that cancels the runner and calls OpenCode `abortSession`; wire client Stop to that path only
- [x] 2.4 Keep a safety max-wait; on timeout persist partial content + timeout outcome, set status `timed_out`, and **always** best-effort `abortSession`

## 3. Stuck session recovery + thin heal

- [x] 3.1 Extend `OpencodeApiService` (or helper) to load session messages / detect unfinished last assistant (`finish` null / non-idle) for a mapped `opencodeSessionId`
- [x] 3.2 Implement recover routine: abort stuck session; idempotent thin-heal of missing/placeholder assistant from completed OC turn into BuildingAI; update turn status (`recovered` / `completed` / `aborted`)
- [x] 3.3 Invoke recover on conversation reopen (messages load path) and immediately before starting a new turn / `prompt_async` when a mapping exists
- [x] 3.4 Unit tests for stuck detection, abort-on-timeout, and heal idempotency (no duplicate assistants for the same OC message id)

## 4. Client: generating + reopen

- [x] 4.1 Expose in-flight turn status to site-chat and detail and OR it with client `background-streams` for the sidebar spinner
- [x] 4.2 On reopen/focus of a conversation with `running` (or after recover), refetch messages from BuildingAI until status clears
- [x] 4.3 Ensure Stop uses the explicit stop path; passive navigation must not call stop
- [x] 4.4 Clear client generating registration when server reports completion/stop/timeout/recovered

## 5. Verification

- [ ] 5.1 Manual: start OpenCode turn → refresh mid-turn → wait for settle → reopen shows persisted assistant (not only Aborted)
- [ ] 5.2 Manual: start turn → explicit Stop → OpenCode aborted and BA shows stopped/aborted; spinner clears
- [ ] 5.3 Manual: reproduce hung OC (`finish: null`) after BA timeout → reopen or next send recovers (abort + optional heal); session accepts a new prompt
- [ ] 5.4 Manual: OC completed ahead of BA → reopen thin-heals assistant into BA without duplicating on second reopen
- [ ] 5.5 Manual: second send while running is rejected; one turn remains
- [ ] 5.6 Manual: open two sessions → send in both → switch back and forth → each shows its own generating progress / final assistant
- [x] 5.7 `openspec validate opencode-detached-turn` (+ unit tests from 3.4)

## 6. Client: re-render detached turn after session switch

- [x] 6.1 Detect when the user re-focuses a conversation whose OpenCode turn is still running (server `opencodeTurnStatus` running + client background-streams active)
- [x] 6.2 Poll OpenCode `GET /session/{opencodeSessionId}/message` periodically while the focused conversation is running, mapping live OC messages into `ChatUIMessage` parts so the user sees tool steps and text progress
- [x] 6.3 Fall back to BuildingAI messages when the focused turn is no longer running; once the server finishes, persist the final assistant and stop the OC poll
- [x] 6.4 Apply the same OC-message polling to the agent-detail chat hook (`useAgentChatStream`); reuse the shared renderer; no duplicate assistants when the same OC message is later persisted by the runner
- [x] 6.5 Unit tests for OC-message → UIMessage mapping and poll lifecycle

## 7. Live OpenCode SSE for focused conversations

- [x] 7.1 Backend: expose `GET /ai-agents/:agentId/chat/conversations/:conversationId/opencode-session/events` that proxies/filter OpenCode session events to the client (auth-checked, only while turn is running)
- [x] 7.2 Backend: expose public equivalent under `/v1/ai-agents/...` for site-chat (publish-token checked)
- [x] 7.3 Client detail chat: replace 2.5s polling with SSE when available; fall back to polling on error
- [x] 7.4 Client site-chat: same SSE upgrade for public agent
- [x] 7.5 Keep polling as fallback; no duplicate assistants between SSE preview and final persisted message
- [x] 7.6 Unit tests for event mapping + SSE lifecycle; manual two-session switch test shows real-time progress
