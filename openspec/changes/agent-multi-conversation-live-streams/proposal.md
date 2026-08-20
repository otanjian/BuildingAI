## Why

Switching agent conversations recreates the visible `useChat` binding, so only the focused thread updates live while other in-flight turns are orphaned from the UI. Users cannot run multiple OpenCode (or other agent) tasks in parallel and still see streaming progress on each conversation. Why now: background-stream work already keeps HTTP/OpenCode turns alive after navigate-away, and detached-turn recovery exists, but the explicit non-goal of “no multi-conversation live display” blocks true parallel workflows.

## What Changes

- Keep a **per-conversation Chat registry** so each in-flight conversation retains its own AI SDK `Chat` instance and stream consumer.
- **Switching conversations only changes the active view** — no `stop()`, no destroy/recreate of the previous Chat solely because the route changed.
- Every registered running conversation **continues to receive and apply stream updates** into its own message state; focusing a conversation shows its live messages immediately.
- Sidebar / generating indicators stay accurate per conversation without relying on the focused `chatSessionKey` alone.
- Soft **concurrency cap** on simultaneous live Chat streams per agent page (protect browser connection limits).
- OpenCode: when a registry Chat is missing after refresh but the server turn is still `running`, rehydrate that conversation via existing session events/poll into a new Chat/store entry (reuse detached-turn live preview path).

## Non-goals

- Multi-pane / split chat UI (multiple visible transcripts at once).
- Changing OpenCode↔BuildingAI 1:1 session mapping or server turn parallelism model.
- Making OpenCode the history source of truth (BuildingAI remains SoT for persisted messages).
- Raising or removing server safety timeouts / explicit Stop behavior.

## Capabilities

### New Capabilities

- `agent-multi-conversation-live-streams`: Client-side parallel live streams across multiple agent conversations via a Chat registry; focus switches view only; each running conversation keeps receiving stream updates.

### Modified Capabilities

- (none under `openspec/specs/` yet — behavior today lives in active changes `agent-conversation-background-stream-and-archive` and `opencode-detached-turn`; this change supersedes their “no multi-conversation live display” non-goal for the client.)

## Impact

- Client: `use-agent-chat-stream`, `use-public-agent-chat-stream`, `use-assistant-for-agent` / public assistant, `background-streams`, OpenCode live preview/SSE wiring on detail + site-chat.
- Server: no required API contract change for MVP (reuse chat stream + existing `opencode-session/events`); optional later list of `running` turns if cache staleness remains an issue.
- Depends on / extends: background-stream (no stop on switch) + detached-turn (server-owned OpenCode turn + re-focus SSE/poll).
- UX: users can start work in conversation A, switch to B and send, return to A and still see continuous streaming / up-to-date tool progress.
