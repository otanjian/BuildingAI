## 1. Regression coverage

- [x] 1.1 Add a failing test proving saved-connection credential testing does not recurse between `testConnection` and `test`.
- [x] 1.2 Add a failing test proving an unresponsive Feishu auth request returns a bounded timeout error.

## 2. Implementation

- [x] 2.1 Extract or route credential validation so the new connection path calls the Feishu auth request directly.
- [x] 2.2 Add an abort timeout and credential-safe error handling around the Feishu auth request.

## 3. Verification

- [x] 3.1 Run focused Feishu service tests and API typecheck.
- [x] 3.2 Restart the local API and verify the saved-connection test endpoint returns instead of remaining pending.
