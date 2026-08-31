## Why

Durable OpenCode turns now protect execution, recovery, persistence, and billing, but the UI still pays for that consistency with provisional new-chat identity, cold history reloads, polling-only progress, and visible gaps when users switch or refresh. Why now: the durable turn is finally a stable control plane, so realtime rendering and conversation navigation can be added as a separate projection layer without returning lifecycle ownership to the browser.

## What Changes

- Give every new OpenCode conversation a stable client-generated UUID before navigation or first send, and represent unsent conversations as disposable local drafts.
- Keep OpenCode conversation messages, active turn state, live projection, composer draft, and scroll state in a conversation-keyed client cache shared by detail and published/site chat surfaces.
- Render cached history immediately and reconcile it in the background; prefetch likely history selections and bound retained conversation state.
- Add a resumable, turn-scoped BuildingAI event stream that exposes versioned full projection snapshots and a terminal event while the durable worker remains the only execution owner.
- Persist a throttled recoverable live projection on the durable turn, clear it atomically at terminal commit, and fall back to authoritative turn-status polling when realtime delivery is unavailable.
- Batch and truncate high-frequency or oversized projection output, virtualize long history lists, and expose latency/reconnect/fallback metrics.
- Remove remaining durable-path provisional Chat rekeying, browser-to-OpenCode event subscriptions, raw OpenCode message polling, and module-scoped background-stream ownership.

### Non-goals

- No change to Dify, Coze, or native Agent streaming behavior.
- No browser ownership of OpenCode execution, completion, recovery, persistence, or billing.
- No durable raw-token event log, cross-device composer-draft sync, branch regeneration, or interactive OpenCode question UI.

## Capabilities

### New Capabilities

- `opencode-realtime-conversation-ux`: Stable local conversation creation, conversation-keyed cached history, recoverable live turn projections, graceful polling fallback, and bounded high-performance rendering for OpenCode Agent chats.

### Modified Capabilities

- `chat-processing-indicator`: OpenCode processing indicators also render the latest recoverable projection and transition atomically to the terminal persisted assistant message.

## Impact

- API: OpenCode turn projection persistence, worker projection updates, authenticated detail/public SSE endpoints, terminal cleanup, and telemetry.
- Database: additive live-projection/version/timestamp fields on the existing OpenCode turn table with a versioned migration.
- Client: shared OpenCode conversation store/cache, stable draft routes, history prefetch/reconciliation, resumable SSE client, bounded rendering, and removal of legacy durable-path stream ownership.
- Operations: one OpenCode runtime event subscription per API process/runtime where supported; status polling remains the fallback and source-independent safety path.
