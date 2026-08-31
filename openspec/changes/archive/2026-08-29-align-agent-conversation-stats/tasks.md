## 1. Align statistics

- [x] 1.1 Update `AgentChatRecordService.getStats` to exclude archived and debug records while
      preserving owner and agent scoping.
- [x] 1.2 Add regression tests proving archived and debug records are excluded from both counters.

## 2. Verification

- [x] 2.1 Run focused API tests, lint, and strict OpenSpec validation.

Verification note: the focused API Jest test, API lint, strict OpenSpec validation, and diff check
pass.
