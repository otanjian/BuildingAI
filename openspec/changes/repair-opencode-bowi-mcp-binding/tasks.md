## 1. Regression coverage

- [x] 1.1 Add failing catalog-sync tests for repairing empty OpenCode bindings, preserving unrelated
      IDs, idempotence, non-OpenCode agents, and missing-server fail-soft behavior.

## 2. Implementation

- [x] 2.1 Implement idempotent OpenCode-agent Bowi binding repair in the catalog synchronization
      service.
- [x] 2.2 Run focused API tests, affected type checks, and strict OpenSpec validation; update this
      task list with verified completion.

## 3. Deployment verification

- [x] 3.1 Restart/reload the managed runtime and verify the affected agent exposes Bowi tools with
      session metadata instead of falling back to shell calls.
