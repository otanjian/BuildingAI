## Why

OpenCode agent chats often show `**error: Aborted**` or `turn timed out` in BuildingAI while OpenCode may still be mid-tool (`finish: null`) or may already have finished. Today the Nest HTTP stream owns the turn: disconnect aborts listening, a hard 15-minute wait can force timeout, and orphaned OpenCode sessions stay stuck—blocking the next turn and leaving false history. Why now: confirmed local sessions (`整理下该项目的skill…`, `mcp链接参数…`) show BA timeout/Aborted vs OC unfinished or continued work; background-stream fixes do not cover this.

## What Changes

- Detach OpenCode **turn lifecycle** from the browser HTTP subscription: a server-side turn continues until OpenCode `session.idle` / error / explicit user stop, then persists messages to BuildingAI.
- Passive disconnect MUST NOT call OpenCode `abortSession` by default and MUST NOT permanently replace a successful remote turn with Aborted solely because HTTP died.
- Only an explicit user **Stop** (or equivalent) aborts the OpenCode session and records a stopped outcome.
- Reopening loads BuildingAI storage (source of truth); in-flight turns remain observable via server-backed status until persist completes.
- **Stuck-session recovery (in scope):** detect OpenCode sessions that are hung mid-turn (e.g. last assistant `finish: null` / non-idle after BA timeout or reopen); **abort** them to free the mapping; when OpenCode already has a completed turn that BuildingAI missed, **thin-heal** BuildingAI assistant content from that session on reopen or before the next send (gap fill only—not full history mirror).

## Non-goals

- No full OpenCode ↔ BuildingAI bidirectional history sync UI or admin mirror tool.
- No change to Dify/Coze/native agent turn ownership in this change.
- No making OpenCode the ongoing UI message source of truth.
- No archive / unified-history product changes.

## Capabilities

### New Capabilities

- `opencode-detached-turn`: OpenCode turns outlive HTTP; persist after settle; passive disconnect ≠ abort; explicit stop aborts; stuck sessions are recovered (abort hang + thin heal when OC completed ahead of BA).

### Modified Capabilities

- (none under `openspec/specs/` yet; this change adds a focused new capability rather than rewriting in-progress OpenCode drafts)

## Impact

- API: `OpencodeChatProvider`, chat controller disconnect wiring, turn runner, conversation turn metadata, OpenCode session inspect/abort helpers, thin heal from session messages.
- Client: Stop vs disconnect; server generating flag; reopen/refetch; optional user-visible “recovering / stopped stuck session” only if needed for clarity.
- Related: builds on `fix-opencode-background-stream-persist` and `agent-conversation-background-stream-and-archive`.
