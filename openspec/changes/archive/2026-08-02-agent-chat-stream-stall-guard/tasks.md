## 1. API idle watchdog

- [x] 1.1 Add helper to resolve `streamIdleTimeoutMs` from agent `toolConfig` (default 90000, `0` disables)
- [x] 1.2 Wire idle AbortSignal into agent chat `streamText` / stream pipe so inactivity aborts the turn
- [x] 1.3 Ensure abort surfaces a clear terminal stream error to the client
- [x] 1.4 Unit-test idle timer resolve + abort-on-idle helper behavior

## 2. Client stall detection

- [x] 2.1 Track last stream progress timestamp while agent chat is streaming
- [x] 2.2 After client stall threshold (default 120000ms), show recoverable “可能已中断 / 请停止并重试” banner
- [x] 2.3 Clear stall banner when stream finishes, errors, or new progress arrives

## 3. Agent defaults + verification

- [x] 3.1 Set SAP ops agent `toolConfig.streamIdleTimeoutMs` to 90000
- [x] 3.2 Run unit tests / typecheck for touched packages
- [x] 3.3 Manual smoke: confirm banner or server abort path is reachable (document result)
