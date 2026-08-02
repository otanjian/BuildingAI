## Context

Agent chat surfaces (`site-chat`, agent detail chat, ask-assistant) stream assistant turns with reasoning, tools, and text. `StreamingIndicator` (pulse dot) only shows when the assistant message is empty and has no reasoning. Once content or tools appear, users lose a bottom-of-turn “still working” cue above the input.

Turn progress is already tracked as `ChatStatus`: `submitted` | `streaming` | `ready` | `error`, plus per-message `isStreaming` / `streamingMessageId`.

## Goals / Non-Goals

**Goals:**
- Show a clear, animated “正在处理...” label under the active assistant turn while the turn is in progress.
- Cover both early wait (`submitted`) and mid-stream tool/thinking gaps.
- Reuse existing shimmer/pulse patterns for a light motion cue.

**Non-Goals:**
- Changing tool Running badges or Reasoning “Thinking...” text.
- New status APIs or websocket events.
- Localization infrastructure beyond matching current Chinese UI copy.

## Decisions

1. **Placement**: Render the indicator at the bottom of the active assistant message (after content/tools), which matches the empty gap above the input in the chat column. For `submitted` before an assistant bubble exists, also allow a shell-level fallback above `PromptInput` when `status` is in progress and there is no streaming assistant message yet.

2. **Visibility**: Show when `status === "submitted" || status === "streaming"` for the current turn’s assistant message (`isStreaming` / regenerating versions). Hide on `ready` and `error`.

3. **Component**: Extend or wrap `StreamingIndicator` into a small `ProcessingIndicator` that shows shimmer text “正在处理...”, optionally keeping a pulse dot. Prefer a shared component under `ask-assistant-ui/components/message/`.

4. **Motion**: Use existing `Shimmer` from `@buildingai/ui` for the text animation (consistent with Reasoning “Thinking...”).

## Risks / Trade-offs

- **Duplication with Thinking...**: Acceptable; Thinking is about reasoning, Processing is “turn not finished.”
- **Layout jump**: Keep the indicator compact (one line) so it does not push the input excessively.
- **Multiple chat shells**: Prefer message-level rendering so site-chat, detail chat, and ask-assistant all get the cue without three one-off UIs; add shell fallback only if needed for pre-assistant `submitted`.
