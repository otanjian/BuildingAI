## Context

`AgentChatCompletionService.truncateMessages` only implements sliding-window by `maxContextMessages`. `ContextConfig` already declares `truncationStrategy: "sliding_window" | "summary"` and `maxContextTokens`, but summary and token limits are unused.

## Goals / Non-Goals

**Goals:**

- Before `ToolLoopAgent.stream`, compress oversized UI message lists when strategy is `summary`.
- Preserve recent turns verbatim; replace older turns with one concise Chinese/English-neutral summary message.
- Honor `maxContextMessages` as the keep-recent budget; use `maxContextTokens` as an additional soft trigger when set.
- Fail soft: on summary errors, use sliding window.

**Non-Goals:**

- Compressing mid-stream tool loop steps inside a single turn (already capped by `maxResultChars`).
- Changing web (non-agent) chat in this change.
- UI for contextConfig (DB/config field already exists; console can set later).

## Decisions

1. **Helper module** `agent-context-compressor.ts` with pure split/build helpers + async `compressMessages` for testability.
2. **Summary model**: prefer `agent.modelRouting.memoryModel`, else chat model.
3. **Summary injection**: one `user` role UIMessage with text part labeling prior context summary (compatible with `convertToModelMessages`).
4. **Trigger**: `messages.length > maxContextMessages` OR estimated chars/4 > `maxContextTokens` when configured; if no limits set and strategy is summary, default `maxContextMessages = 16`.
5. **Keep recent**: `Math.max(4, Math.floor(maxContextMessages / 2))` recent messages, always ensuring last user message is included.

## Risks / Trade-offs

- Extra LLM call adds latency; only when over limit.
- Summary may omit details; mitigated by keeping recent verbatim turns and tool-result truncation.

## Migration

Set SAP agents `contextConfig.truncationStrategy` to `summary` (already have `maxContextMessages: 16`).
