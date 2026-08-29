## 1. Backend foundations

- [x] 1.1 Add the Feishu SDK dependency to the API workspace package.
- [x] 1.2 Add tested DTOs and pure helpers for configuration validation, secret masking, event text
      extraction, and anonymous identifiers.
- [x] 1.3 Implement the Feishu channel service backed by grouped dictionary entries, including
      startup restore, save, test, enable/disable, status, Redis idempotency, conversation mapping,
      agent invocation, and Feishu replies.
- [x] 1.4 Add console controller routes and register the service/controller in `ChannelModule`.

## 2. Console experience

- [x] 2.1 Add typed console API hooks for listing, saving, testing, and toggling Feishu channel
      configurations.
- [x] 2.2 Add a Feishu channel page with agent selection, credential fields, masked-secret handling,
      test button, enable/disable control, and live status/error display.
- [x] 2.3 Register the page in console routing/navigation and ensure permission failures render the
      existing unauthorized state.

## 3. Verification and documentation

- [x] 3.1 Run focused backend unit tests for helpers and channel service behavior, then run API
      typecheck/lint.
- [x] 3.2 Run client typecheck/lint/build checks and manually verify the one-click configuration
      flow against mocked API responses.
- [x] 3.3 Validate the OpenSpec change and mark completed tasks after fresh verification.
- [x] 3.4 Fix the blocking public chat adapter to consume UI-message SSE chunks with a
      Node-compatible response shim before returning the Feishu reply.
- [x] 3.5 Restore the saved Feishu agent selection when reopening the configuration page, while
      preserving manual selections and masked-secret behavior.
- [x] 3.6 Handle empty or malformed agent responses with a safe upstream diagnostic instead of an
      opaque JSON parsing failure.
- [x] 3.7 Stream UI-message SSE deltas into a throttled native Feishu CardKit reply, finalize the
      card, and fall back to a final text reply when streaming cards are unavailable.
- [x] 3.8 Keep the channel module independent from AiAgentsModule; Feishu uses only the published
      standard-agent API and has no durable-turn gateway dependency.
