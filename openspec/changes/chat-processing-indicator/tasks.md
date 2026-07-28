## 1. Component

- [x] 1.1 Add a `ProcessingIndicator` (or extend `StreamingIndicator`) with animated “正在处理...” text using existing Shimmer/pulse patterns
- [x] 1.2 Export the component from the ask-assistant-ui message components area

## 2. Wire into chat

- [x] 2.1 Show the indicator on the active assistant message while `isProcessing` / streaming
- [x] 2.2 Ensure it hides when the turn completes or is stopped
- [x] 2.3 Cover `submitted` wait if no assistant content yet (shell fallback above PromptInput if needed)
- [x] 2.4 Always show sticky “正在处理...” above PromptInput while status is submitted/streaming (do not gate on streamingMessageId)

## 3. Verify

- [x] 3.1 Spot-check site-chat / agent chat layout: indicator appears under streaming content and above input, disappears when ready
- [x] 3.2 Rebuild web and restart so production serves the indicator
