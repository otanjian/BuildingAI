## Context

Agent chat uses AI SDK UI message streams over SSE (`POST …/chat/stream`). Multi-step tool loops emit reasoning and tool events, then wait on the next model call. If that wait hangs or the client disconnects without a clean finish, the UI can freeze on “Thought for N seconds” / “tools completed” with no answer text and no error.

Today there is tool execution timeout (`toolConfig.toolTimeout`) but no **idle timeout across the whole stream** after events start flowing.

## Goals / Non-Goals

**Goals:**

- Abort stalled agent streams when no UI-message stream chunk arrives for a configured idle window.
- Surface a clear terminal error to the client.
- Client detects the same stuck UX and shows recoverable guidance even if the server never responds.
- Keep defaults conservative enough for slow models + MCP (idle ≥ 90s recommended).

**Non-Goals:**

- Auto-retry the entire turn without user action.
- Heartbeat keep-alives to defeat nginx (proxy already allows long `proxy_read_timeout`).
- Changing MCP connection lifetime.

## Decisions

1. **Idle watchdog on the API stream path**  
   Wrap/monitor the outbound UI message stream (or abort controller used by `streamText` / `pipeUIMessageStreamToResponse`). Reset the idle timer on each emitted chunk. On expiry: abort the turn and write a final error event / close the response.  
   *Alternative considered:* only frontend detection — rejected because the server would keep burning model/MCP resources.

2. **Default idle = 90 seconds**  
   Configurable via `agent.toolConfig.streamIdleTimeoutMs` (number). `0` disables. Fallback constant in code if unset.  
   *Alternative:* 30s — too aggressive for reasoning models after a tool call.

3. **Client stall threshold slightly above server**  
   e.g. 100–120s without progress while `status === streaming`, show banner: stream may be interrupted; suggest Stop + retry. Also treat “timer text frozen” as progress absence if we can observe last event time from the transport.

4. **Scope: agent chat first**  
   Apply to `AgentChatCompletionService` (console + published agent chat). Datasets/generic chat can reuse later.

## Risks / Trade-offs

- [False abort on very slow model] → Mitigation: 90s default; allow per-agent override.
- [Abort mid-tool leaves partial UI state] → Mitigation: existing abort handling; message may be incomplete; user retries.
- [Client threshold races server] → Mitigation: client threshold ≥ server idle.

## Migration Plan

- Deploy API + web together.
- No DB migration; JSON `toolConfig` optional field.
- Rollback: set `streamIdleTimeoutMs: 0` or revert release.

## Open Questions

- None blocking; start with 90s server / 120s client defaults.
