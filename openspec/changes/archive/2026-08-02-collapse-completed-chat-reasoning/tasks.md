## 1. Partition helper

- [x] 1.1 Add `partitionReasoningPartsForDisplay` using `isReasoningPartStreaming`, with unit tests for completed/active split and collapse flag
- [x] 1.2 Run helper tests and confirm they pass

## 2. Message UI

- [x] 2.1 Render completed reasoning inside a `Task` summary (`已完成 N 个思考过程`, default closed)
- [x] 2.2 Keep the active streaming reasoning step outside the group, default open
- [x] 2.3 Verify lint/typecheck on touched client files

## 3. Verification

- [x] 3.1 Manually or via tests confirm: mid-stream only active thought is open; after turn all thoughts sit in collapsed summary
