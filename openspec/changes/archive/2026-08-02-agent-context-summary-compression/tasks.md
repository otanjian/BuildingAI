## 1. Helper + tests

- [x] 1.1 Add `agent-context-compressor` helpers (split, estimate, build summary message)
- [x] 1.2 Unit tests: under limit no-op; sliding window; summary path with mocked generator

## 2. Wire into agent chat

- [x] 2.1 Replace sync `truncateMessages` with async compress using strategy
- [x] 2.2 Pass language model (memory/chat) into compressor
- [x] 2.3 Log compression events at debug/warn

## 3. Enable + verify

- [x] 3.1 Set SAP agents `truncationStrategy: summary`
- [x] 3.2 Build API and restart PM2
- [x] 3.3 Mark OpenSpec tasks complete
