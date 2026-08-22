## Context

See `proposal.md` for motivation and the delta specs for observable behavior. `opencode-turn-consistency` already makes PostgreSQL `AgentOpencodeTurn` the durable execution owner and `AgentChatMessage` the terminal history owner. The remaining durable client still borrows AI SDK `Chat` instances as message containers, status-polls once per second, and does not expose partial remote output. The legacy path also contains a browser-to-OpenCode session-event proxy and raw-message fallback that must never become a second durable lifecycle.

The deployed OpenCode runtime exposes one global event stream per runtime rather than a documented durable per-session event cursor. Therefore BuildingAI can use events as invalidation hints, but recovery must come from a versioned BuildingAI projection snapshot and durable turn status.

## Goals / Non-Goals

**Goals:**

- Preserve the existing idempotent turn/lease/terminal transaction as the only control plane.
- Make new-chat navigation and cached history selection synchronous from the user's perspective.
- Deliver resumable full live projections with exact authorization and monotonic versioning.
- Bound upstream connections, update rate, payload size, cache size, and mounted history rows.
- Use the same projection protocol and conversation-store primitives on detail and public/site chat.

**Non-Goals:**

- Persist every raw OpenCode event or guarantee lossless token replay.
- Coordinate upstream runtime connections across API processes; the bound is per process/runtime.
- Change terminal message retention or make projections part of billing evidence.
- Replace durable status polling as the correctness fallback.

## Decisions

### 1. Keep control and display planes separate

`AgentOpencodeTurn.status`, its lease, and the terminal transaction continue to decide execution and completion. New projection fields (`live_projection`, `projection_version`, `projection_updated_at`) are display-only. An SSE disconnect only removes a subscriber. Terminal transition clears projection fields in the same transaction that saves the assistant and billing result.

Alternative: let an upstream event such as `session.idle` complete the browser stream. Rejected because it recreates the completion race P0 removed.

### 2. Persist the latest full snapshot, not a raw event log

The projection contains the current UI parts for the exact assistant descendants of the durable turn's stable remote user message. Updates increment one monotonic bigint version using an atomic database update. Text/reasoning/tool values are bounded for live display; terminal projection still follows existing final assembly rules. Full snapshots make reconnect idempotent and allow stale versions to be ignored.

Alternative: store token deltas with durable cursors. Rejected because it adds an event table, retention and compaction before product evidence requires replay fidelity.

### 3. One lazy runtime hub per normalized runtime per API process

`OpencodeRuntimeEventHubService` keys connections by a credential-free runtime fingerprint and holds one upstream `/event` subscription while at least one exact-session subscriber exists. Events are routed only when their exact session ID can be extracted. Message-related events are invalidation hints: a per-turn projector coalesces them for 100ms, then reads bounded session messages, builds the full projection, and persists/publishes it. Connection failures back off and never mutate turns.

Alternative: one upstream event connection per browser. Rejected for connection amplification, listener accumulation, and inconsistent filtering. Alternative: worker polling only. Retained as fallback but too latent for the primary display path.

### 4. Turn-scoped SSE resumes from BuildingAI versions

`GET /ai-agents/:agentId/chat/opencode-turns/:turnId/events` uses the same registered/public ownership contract as status. It accepts `Last-Event-ID`, immediately emits any newer stored projection, emits heartbeats, subscribes to the local projector, and periodically reads the turn row so projections written by another API instance and terminal state are observed. Events are `projection`, `terminal`, and `heartbeat`; no runtime config or raw OpenCode event is exposed.

Alternative: proxy raw OpenCode SSE. Rejected because OpenCode event IDs are not a durable BuildingAI cursor and raw events expose schema/runtime coupling.

### 5. A conversation-keyed external store owns durable UI state

A small framework-independent store is keyed by authenticated chat scope and conversation UUID. Each entry retains persisted messages, active turn, latest projection/version, composer draft, scroll position, load state, and last-access time. React consumes immutable snapshots with `useSyncExternalStore`. The store keeps the active entry and active turns, then evicts least-recently-used inactive entries beyond 20.

AI SDK `Chat` remains only for non-OpenCode/legacy providers. Durable OpenCode send writes an optimistic user message keyed by `turnId` into the conversation store, accepts the command, then combines persisted messages with at most one projected assistant. Terminal refresh replaces both optimistic/projection state by stable database identities.

Alternative: extend the existing `ConversationChatRegistry`. Rejected because a network transport object would continue to own durable display state.

### 6. Stable local drafts use the final conversation UUID

New-chat actions generate a UUID and navigate immediately. An empty entry is local-only until first turn acceptance; first send uses that UUID. Leaving an unsent entry deletes it. This eliminates `new-*` keys and response-driven route replacement for the durable path while leaving legacy providers unchanged.

### 7. History is cache-first and bounded

Cached messages render immediately. An authoritative page-one request runs in the background and uses stable message/turn identities to reconcile rather than overwrite. Pointer hover or keyboard focus prefetches one bounded page. The sidebar uses fixed-row windowing with overscan; rename mode may pin its row until editing finishes. Composer drafts and scroll positions are restored per entry.

### 8. Realtime failure degrades to existing status observation

The turn client opens SSE and status polling for the same `turnId`; SSE only updates projection, while polling remains the durable terminal detector. Successful SSE health lengthens (but does not remove) status polling. Failure records telemetry and restores the normal polling cadence. There is still one execution lifecycle.

## Risks / Trade-offs

- **[Risk] Global OpenCode events omit session identity** → Ignore unscoped events and rely on bounded status/message polling; never broadcast them across sessions.
- **[Risk] JSONB projection updates create table bloat** → Coalesce to at most one write per 100ms, use full replacement, clear terminal projections, and monitor write rate; split a hot table only if measurements require it.
- **[Risk] API instance receiving SSE differs from the worker instance** → Poll the versioned turn row on the SSE endpoint; local notifications optimize latency but are not correctness dependencies.
- **[Risk] Projection mapping differs from final output** → Reuse exact-descendant projection logic and make terminal persisted history authoritative.
- **[Risk] Windowed rows have variable height during rename** → Use a conservative fixed height and pin/overscan the editing row.
- **[Trade-off] Status polling remains during healthy SSE** → Use a longer health cadence to preserve restart and terminal correctness without a distributed event outbox.

## Migration Plan

1. Add nullable projection JSONB/timestamp plus non-null bigint version with an idempotent migration; reconcile unexecuted current-version migrations by migration-history name so installed patch versions receive additive migrations, and deploy readers before writers.
2. Add projection repository/projector/runtime hub and turn-scoped SSE behind the existing durable-turn rollout flag.
3. Add the shared client store and SSE consumer; enable stable draft routes and cache-first history on internal OpenCode agents.
4. Remove the durable path's provisional Chat rekey and legacy browser OpenCode event/raw-message paths after both chat surfaces use projections.
5. Roll out while monitoring projection latency/write rate, upstream connection count, reconnect/fallback counts, cache hit rate, and terminal-with-live-projection invariants.

Rollback disables SSE/projector writers and returns clients to durable status polling. The additive columns and cached client entries are harmless; active turns continue through the P0 control plane. Do not restore browser lifecycle ownership.
