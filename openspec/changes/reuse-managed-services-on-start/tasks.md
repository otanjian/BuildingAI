## 1. Startup orchestration

- [x] 1.1 Add managed-service health detection for Doris PM2 processes.
- [x] 1.2 Reuse healthy Doris services on normal startup while preserving force behavior.
- [x] 1.3 Reuse healthy detached API/web services on `./start.sh -d`.

## 2. Verification

- [x] 2.1 Run shell syntax and Doris contract tests.
- [x] 2.2 Start the stack with `./start.sh -d` and verify health endpoints and status.
- [x] 2.3 Validate the OpenSpec change.
