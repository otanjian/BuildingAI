## 1. Regression coverage

- [x] 1.1 Add controller tests that hold existing-session metadata refresh and placeholder-title
      lookup open, verify the embed response resolves first, then verify deferred calls complete and
      failures are contained.

## 2. Backend implementation

- [x] 2.1 Refactor OpenCode embed bootstrap so optional existing-session metadata refresh runs
      asynchronously with caught errors.
- [x] 2.2 Refactor placeholder-title synchronization to run asynchronously while preserving the
      response fields and client polling contract.

## 3. Verification

- [x] 3.1 Run focused controller tests, API typecheck/build, and OpenSpec validation; inspect the
      diff for compatibility and scope.
