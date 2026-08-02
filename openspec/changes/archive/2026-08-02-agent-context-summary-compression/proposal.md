## Why

Agent chats with MCP tools accumulate large tool results and multi-step reasoning. Sliding-window truncation alone drops history without preserving conclusions, and models still hit `context window exceeds limit`. We need automatic AI summarization of older turns so conversations continue with compressed context.

## What Changes

- Implement `contextConfig.truncationStrategy: "summary"` for agent chat.
- When message count (and optionally estimated tokens) exceeds limits, summarize older UI messages via the agent's memory/chat model, then keep: system prompt + summary message + recent turns.
- Fall back to sliding-window truncation if summarization fails.
- Enable summary strategy on SAP assistants (and document defaults).

## Capabilities

### New Capabilities

- `agent-context-compression`: Automatic compression of agent conversation context via summary or sliding window before model invocation.

### Modified Capabilities

- None (behavior addition under existing agent chat).

## Impact

- `packages/api` agent chat completion path
- Agent `contextConfig` usage (`truncationStrategy`, `maxContextMessages`, `maxContextTokens`)
- Slight extra latency/cost when compression triggers (one summary LLM call)
