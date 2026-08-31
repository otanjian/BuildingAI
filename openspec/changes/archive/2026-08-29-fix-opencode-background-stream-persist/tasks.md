## 1. Client: per-stream generating indicator

- [x] 1.1 In `use-public-agent-chat-stream.ts`: capture the in-flight stream’s conversation id (send-time id and/or first `data-conversation-id` for that stream); `onFinish` / `onError` / `stop` call `unregisterBackgroundStream` with that captured id only
- [x] 1.2 In `use-public-agent-chat-stream.ts`: assign `streamTargetConversationIdRef` only when `isActiveStream` is true so background `data-conversation-id` cannot overwrite visible-stream mapping
- [x] 1.3 Apply the same capture/unregister and active-only ref rules in `use-agent-chat-stream.ts` (detail page)
- [x] 1.4 Sanity-check: `pnpm` eslint/typecheck on touched client files; no behavior change to `background-streams.ts` public API unless a small helper is clearly needed

## 2. API: OpenCode persist before finish

- [x] 2.1 In `opencode-chat.provider.ts`: persist user message early after local conversation id is known (emit `data-user-message-id`); skip duplicate user create at end-of-turn when already saved
- [x] 2.2 In `opencode-chat.provider.ts`: run `saveMessages` (assistant + stats/metadata as today) **before** writing stream `finish` / `finish-step` so client `onFinish` implies DB rows exist
- [x] 2.3 Preserve regenerate / abort / billing behavior: regenerate still uses parent id; abort and error paths still unregister-friendly; usage/billing ordering remains correct relative to saved assistant message
- [x] 2.4 Run API typecheck (and any existing OpenCode-related unit tests if present) on touched provider files

## 3. Client: refetch visible conversation after finish

- [x] 3.1 On stream `onFinish` in site-chat: if finished conversation id equals `activeConversationIdRef`, refetch that conversation’s messages and `setMessages` from BuildingAI (reuse public messages fetch used by paging)
- [x] 3.2 Mirror refetch-on-active-finish in detail `use-agent-chat-stream.ts` / assistant wiring
- [x] 3.3 Keep existing conversation-list `invalidateQueries` on finish; ensure refetch does not fight an in-progress visible stream (`status` streaming/submitted)

## 4. Verification

- [ ] 4.1 Superseded OpenCode verification: tracked by `opencode-turn-consistency` 9.1/9.2
- [ ] 4.2 Superseded OpenCode verification: tracked by `opencode-turn-consistency` 9.2/9.4
- [ ] 4.3 Superseded OpenCode verification: tracked by `opencode-turn-consistency` 9.2/9.4
- [ ] 4.4 Retained scope: confirm non-OpenCode detail chat still streams and clears its indicator (OpenCode portion is superseded)
- [x] 4.5 Run `openspec validate fix-opencode-background-stream-persist` (and `--strict` if used in repo)
> Ownership reconciliation (2026-08-21): OpenCode persistence, generating status,
> refresh/switch behavior, and its remaining manual scenarios are superseded by
> `opencode-turn-consistency` 9.1, 9.2, and 9.4. The non-OpenCode smoke portion of
> 4.4 remains owned by this change.
