## 1. P0 Durable Baseline Reconciliation

- [x] 1.1 Restore the verified `opencode-turn-consistency` task state from implementation history, retain the new history-race regression task, and run focused durable turn schema/repository/worker/commit/client tests
- [x] 1.2 Add durable-path regression assertions that browser OpenCode session SSE, raw session-message polling, provisional `new-*` Chat rekeying, and module-scoped background streams are not used when durable turns are enabled

## 2. Recoverable Projection Schema

- [x] 2.1 Add failing entity and migration tests for nullable JSONB live projection, non-negative bigint projection version, nullable projection timestamp, and terminal projection clearing
- [x] 2.2 Add the projection fields and an idempotent versioned PostgreSQL migration, reconcile same-version pending migrations at startup, then update exports and installed-schema verification
- [x] 2.3 Add failing repository tests for lease-fenced coalesced projection writes, monotonic versions, stale-write rejection, payload bounds, and terminal clearing
- [x] 2.4 Implement the projection sanitizer/repository and projection telemetry without logging content

## 3. Runtime Event Hub and Projector

- [x] 3.1 Add failing runtime-hub tests for one upstream connection per runtime/process, exact session routing, reconnect backoff, subscriber removal, and idle teardown
- [x] 3.2 Implement the lazy runtime event hub using normalized runtime fingerprints and exact-session fan-out
- [x] 3.3 Add failing projector tests for 100ms event coalescing, exact assistant-descendant snapshots, monotonically versioned persistence, tool-output truncation, and harmless upstream failures
- [x] 3.4 Implement the turn projector, connect it to active worker/session mappings, and force a final projection/cleanup boundary around terminal commit

## 4. Authorized Resumable SSE

- [x] 4.1 Add controller/service tests for registered and anonymous ownership, cross-agent rejection, `Last-Event-ID`, immediate stored snapshot, local notifications, cross-instance row polling, heartbeat, terminal event, and disconnect cleanup
- [x] 4.2 Implement the detail/public turn-scoped projection SSE endpoint and shared web-service subscription types with status-poll fallback signals
- [x] 4.3 Remove the legacy conversation-scoped raw OpenCode event endpoint from the durable path and add an architectural regression test preventing its return

## 5. Conversation-Keyed Client Store

- [x] 5.1 Add failing framework-independent store tests for stable draft UUIDs, optimistic user turns, per-conversation persisted/projection/draft/scroll state, stale-version rejection, terminal replacement, and protected LRU eviction
- [x] 5.2 Implement the scoped OpenCode conversation store plus `useSyncExternalStore` bindings shared by detail and public/site chat
- [x] 5.3 Add failing merge tests for cache-first page-one reconciliation by database/turn identity when history races optimistic user and projected assistant content
- [x] 5.4 Implement cache-first history hydration, bounded prefetch, background reconciliation, and terminal invalidation

## 6. Stable New Conversation UX

- [x] 6.1 Add detail and public navigation tests proving “新对话” immediately uses a final UUID route, focuses the composer, and disposes unsent local drafts without API creation
- [x] 6.2 Implement stable local draft navigation and first-send UUID reuse on both chat surfaces, removing durable `new-*` rekey and response-driven route replacement
- [x] 6.3 Preserve composer drafts and scroll positions per conversation and restore them during cached switches without an empty or previous-conversation frame

## 7. Live Projection Rendering and Fallback

- [x] 7.1 Add client SSE tests for resume version, full-snapshot replacement, duplicate/stale suppression, reconnect, polling fallback, terminal refresh, and browser-close non-cancellation
- [x] 7.2 Integrate the resumable projection client with the deterministic turn client and render one projected assistant plus processing indicator on both chat surfaces
- [x] 7.3 Adapt status polling cadence to healthy/unhealthy SSE while keeping terminal detection authoritative and eliminating durable browser OpenCode/raw-message streams

## 8. Performance and Observability

- [x] 8.1 Add fixed-row windowing with bounded overscan to detail and public history lists, preserving selection, rename, archive, keyboard focus, and prefetch behavior
- [x] 8.2 Batch client projection renders, cap live payload tails, and add unit/performance tests for burst updates and oversized tool outputs
- [x] 8.3 Add content-free metrics for projection latency/write rate, upstream connections, reconnect/fallback, truncation, and conversation-cache hits/misses

## 9. End-to-End Verification and Rollout

- [x] 9.1 Add API integration scenarios for A/B parallel turns, projection resume, restart/cross-instance reads, SSE loss, terminal atomic replacement, Stop, and anonymous ownership
- [x] 9.2 Add browser scenarios for immediate new chat, cached switching, refresh mid-turn, reconnect/fallback, terminal replacement, draft/scroll restore, large history, and both chat surfaces
- [x] 9.3 Run strict OpenSpec validation, focused and full API/client tests, lint, typecheck, production builds, migration replay, and a static assertion that durable clients open no raw OpenCode event/message path
- [ ] 9.4 Run a real internal OpenCode turn with switch/refresh/network interruption and document measured new-chat, cache-switch, projection, and terminal replacement latency plus rollback instructions
