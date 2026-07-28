## Why

Agent chats with multi-step MCP tools can appear frozen after a tool finishes: the UI keeps showing “Thought for N seconds” and “N tools completed” while no answer text arrives. Often the SSE stream has stalled waiting on the next model step, or the client lost the stream without surfacing an error. Users wait indefinitely instead of recovering.

Why now: SAP ops/analysis assistants already hit this during “deeper analysis” follow-ups; we need a product-level guard, not only prompt tweaks.

## What Changes

- Add a **server-side stream idle watchdog** that aborts an agent chat stream when no stream events arrive for a configurable idle period after streaming has started.
- Emit a clear terminal error/notice to the client when the watchdog fires so the UI can show “interrupted / please retry”.
- Add **client-side stall detection** for agent chat: if thinking/tools are visible but no new stream progress for a threshold, show a recoverable “可能已中断” state with stop/retry guidance.
- Document agent-level defaults for idle timeout (sensible default; overridable later via tool/chat config if already present).

## Non-goals

- Changing MCP connection registry TTL / auto-reconnect for SAP (separate concern).
- Replacing model reasoning behavior or removing thinking UI.
- Full offline replay of aborted mid-turn tool state.

## Capabilities

### New Capabilities

- `agent-chat-stream-stall-guard`: Detect and recover from stalled agent chat SSE streams on API and client.

### Modified Capabilities

- (none)

## Impact

- `packages/api` agent chat completion / stream piping
- `packages/client` agent chat UI (detail chat and/or public agent chat hooks)
- OpenSpec change `agent-chat-stream-stall-guard`
