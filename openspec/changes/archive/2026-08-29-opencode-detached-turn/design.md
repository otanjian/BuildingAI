## Context

See proposal.md for motivation. Today `OpencodeChatProvider.streamChat` ties the OpenCode turn to the Nest HTTP response: `req`/`res` close aborts `abortSignal`, which stops `/event` subscription and may call `abortSession`. A hard **15-minute** `maxWaitMs` forces `OpenCode turn timed out` and finishes HTTP even when OpenCode’s last assistant still has `finish: null` (mid-tool)—leaving an orphaned remote session. BuildingAI remains the UI history source of truth; OpenCode holds `metadata.opencodeSessionId` for execution continuity.

Observed local repro (2026-08-15): `整理下该项目的skill…` timed out at 15m while OC last activity was ~31s with unfinished tools; `mcp链接参数…` mixed Aborted, one real BA assistant, further timeouts, OC still `finish: null`. Sidebar spinners were client `background-streams` never cleared.

## Goals / Non-Goals

**Goals:**

- Server-owned OpenCode turn lifecycle that outlives passive HTTP disconnect.
- Persist complete (or true error/stop/timeout) BuildingAI messages after remote settle.
- Explicit user Stop → `abortSession`; passive disconnect does not.
- Recoverable generating visibility after refresh.
- **Recover stuck OpenCode sessions:** abort hangs; thin-heal BA when OC completed ahead of BA.

**Non-Goals:**

- Full history mirror / CRDT merge of entire OC session into BA.
- Changing Dify/Coze providers.
- Removing the overall turn ceiling entirely (keep safety timeout; may raise/configure).

## Decisions

### D1: Detach turn runner from HTTP abort

Introduce an in-process OpenCode turn runner keyed by `conversationId`. HTTP `streamChat` starts or attaches as a **subscriber**; `req.close` / `res.close` only unsubscribe the client writer—they do **not** abort the runner or call `abortSession`.

**Alternative considered:** Keep abort-on-disconnect — rejected; causes Aborted vs OC-still-running split brain.

### D2: Explicit stop channel

Prefer a dedicated `POST …/conversations/:id/stop` (or agent-scoped equivalent) that cancels the runner + `abortSession`. Do not treat passive close as stop.

**Alternative considered:** Never `abortSession` — rejected; users need real stop and stuck recovery needs abort.

### D3: Persist after remote settle; HTTP finish is optional

Runner listens until `session.idle` / `session.error` / explicit cancel / safety timeout, then `saveMessages` (keep early user persist). Live subscribers get UI stream + `finish` after persist; otherwise persist-only and clients refetch.

### D4: Server-visible in-flight flag

`metadata.opencodeTurnStatus: "running" | "completed" | "aborted" | "timed_out" | "recovered"` (+ `startedAt` / `endedAt`). Sidebar ORs client `background-streams` with this flag.

### D5: Safety timeout always attempts OC abort

On BuildingAI safety timeout: persist partial assembled parts + timeout outcome, set `timed_out`, and **always** best-effort `abortSession` so OpenCode does not remain mid-tool orphaning the mapped session. (Previous design left abort optional—now required for stuck prevention.)

**Alternative considered:** Leave OC running after BA timeout hoping it finishes for later heal — rejected for the stuck sessions we saw; heal still runs if OC somehow completed before abort lands.

### D6: One active turn per conversation

Reject overlapping sends while status is `running`.

### D7: Stuck-session detection and recovery

**Detect** stuck when any of:

- BA status is `running` but runner is gone (process restart) and OC last assistant has `finish: null` / session not idle; or
- BA already `timed_out` / `aborted` / completed with timeout error text, yet mapped OC session still has an unfinished assistant / non-idle work; or
- Before `prompt_async` on a mapped session, OC appears busy/unfinished from a prior turn.

**Recover:**

1. Best-effort `abortSession` to clear the hang.
2. **Thin heal (gap fill):** If OC has a completed assistant turn newer than BA’s last persisted assistant (or BA only has timeout/Aborted placeholder for that user turn), map OC text/tool parts into a BuildingAI assistant message (reuse existing event→UIMessage mapping where possible), replacing or appending per idempotent rules (do not duplicate the same OC message id—store `metadata.lastHealedOpencodeMessageId` or equivalent).
3. Clear in-flight flag; set status `recovered` or `completed` / `aborted` as appropriate.
4. Trigger points: conversation reopen, before next send, and after safety timeout (abort path). No full-session rewrite.

**Alternative considered:** Always recreate OpenCode session on timeout — heavier; loses OC context. Prefer abort + reuse same session id when OC allows continuing after abort.

### D8: Heal is best-effort, BA remains SoT going forward

Heal repairs gaps; subsequent turns still persist from the runner. If mapping fails, still abort stuck OC and leave BA error text rather than blocking send forever.

### D9: Re-focus shows live OpenCode progress

When the user switches back to a conversation whose detached turn is still running, the new `useChat` instance has no active HTTP stream. It MUST render the current turn by polling OpenCode `GET /session/{opencodeSessionId}/message` (or equivalent) and mapping the latest session messages into `ChatUIMessage` parts. This provides live tool/text visibility until the runner settles and persists the final message into BuildingAI.

**Why not re-attach the original SSE?** The original SSE belongs to the previous `useChat` instance; re-subscribing mid-stream is fragile and loses already-emitted deltas. Reading the session's persisted message list is stable and idempotent.

**Why not make OpenCode the source of truth?** BuildingAI still owns branching (`parentId`), billing, multi-user authorization, and non-OpenCode agents. Live rendering is a read-through cache, not a SoT change.

**Polling cadence:** 2–4 seconds while the focused conversation is `running`; stop when `session.idle` / `session.error` / BA status no longer `running` / user navigates away. Reduce load by pausing polls for background (non-focused) conversations.

### D10: Upgrade live re-focus to OpenCode SSE

D9's message polling is the **fallback**. When OpenCode exposes a stable `/event` stream per session, BuildingAI SHOULD proxy it to the focused client so progress appears in real time without polling.

- **Why SSE over polling?** Lower latency, no interval drift, and browser `EventSource` automatically reconnects with `Last-Event-ID`, which survives page refresh better than hand-rolled polling.
- **Why not just keep polling?** Polling is fine as a safety net, but every refocused conversation adds HTTP traffic and still has a 2.5 s gap. SSE is the native OpenCode push channel already used by the turn runner.
- **Fallback rule:** If the SSE endpoint errors, drops, or the conversation is no longer `running`, the client MUST fall back to D9 polling (or plain BA messages) so the user never sees a blank assistant.

**Implementation notes:**

- New authenticated endpoint: `GET /ai-agents/:agentId/chat/conversations/:conversationId/opencode-session/events` (and the public `/v1` equivalent) that streams filtered OC events for the mapped `opencodeSessionId`.
- Client subscribes only while the focused conversation is running and no active `useChat` SSE exists; it renders the same `buildOpencodeLivePreview` parts from live events.
- On `session.idle` / `session.error` / `finish`, the client stops the SSE and refetches persisted BA messages.

## Risks / Trade-offs

- [API restart mid-turn] → Runner lost; D7 reopen/pre-send recovery clears OC + metadata TTL.
- [Multiple API instances] → In-memory runner not shared; document single-instance MVP.
- [Abort races with late idle] → May truncate a turn that would have finished; prefer unblocking over waiting forever after BA timeout.
- [Heal duplicate messages] → Idempotent keys on OC message ids / replace timeout placeholder for same user turn.
- [Tool part fidelity] → Heal may be lossy vs live stream; acceptable for rescue.

## Migration Plan

1. Deploy runner + stop + timeout-abort + metadata.
2. Deploy stuck detect/heal on reopen and pre-send.
3. Deploy client generating flag + Stop wiring + refetch.
4. Deploy live OC-message rendering on re-focus (this closes the two-session switch gap).
5. Rollback: revert services/hooks; ignore metadata.

## Open Questions

None blocking. Heal richness (tools vs text-only) can start text+summary tools and deepen if mapping already exists in the provider.

- [Design choice] Should the OC-message poll live in `usePublicAgentChatStream` (closer to useChat) or in `usePublicAgentAssistant` (closer to the message repository)? Candidate: start in `usePublicAgentChatStream` so `setMessages` naturally merges with AI SDK state; assistant layer only decides *when* to poll based on `status` and `opencodeTurnStatus`.
