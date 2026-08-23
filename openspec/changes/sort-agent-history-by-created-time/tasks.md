## 1. Regression Coverage

- [x] 1.1 Add a focused client contract test requiring the agent detail history query to use `createdAt` and verify it fails against the current `updatedAt` behavior.

## 2. Implementation

- [x] 2.1 Change the agent detail history query to request server-side `createdAt` ordering.
- [x] 2.2 Re-run the focused test and confirm the creation-time contract passes.

## 3. Verification and Deployment

- [x] 3.1 Run focused client tests, type checking, and linting for the affected files.
- [x] 3.2 Build the web client, restart the local development services, and confirm their health.
- [x] 3.3 Verify in the browser that the history request uses `sortBy=createdAt` and returned creation timestamps are descending.
- [x] 3.4 Validate the OpenSpec change and review the final scoped diff.
