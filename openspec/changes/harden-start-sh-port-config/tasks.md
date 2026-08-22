## 1. Contract

- [x] 1.1 Add a failing shell contract test for custom API and web port propagation.

## 2. Implementation

- [x] 2.1 Load configurable ports and centralize the derived port list/API URL in `start.sh`.
- [x] 2.2 Replace fixed API port references in readiness, status, cleanup, and output paths.

## 3. Verification

- [x] 3.1 Run both start.sh contract tests, `bash -n start.sh`, and strict OpenSpec validation.
- [x] 3.2 Run a live status/health check with the default ports and confirm the worktree is clean.
