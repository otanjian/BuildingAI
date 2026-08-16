## 1. API — OpenCode workspace proxy

- [x] 1.1 Add path-safe workspace resolution helper + unit tests (reject escapes; filter ignored/noise basenames)
- [x] 1.2 Extend `OpencodeApiService` with listFiles and readFileContent against OpenCode `/file` and `/file/content`
- [x] 1.3 Add authenticated agent web endpoints for workspace list and content; gate on `createMode === "opencode"`
- [x] 1.4 Unit/integration tests for controller or service filtering and path rejection

## 2. Client services

- [x] 2.1 Add web service functions + React Query hooks for workspace files list/content
- [x] 2.2 Export types for file node and content responses

## 3. Chat UI — toggle and panel

- [x] 3.1 Show header toggle only when `agent.createMode === "opencode"`; wire open/close state
- [x] 3.2 Add right dock panel with lazy `FileTree` (load children on expand)
- [x] 3.3 On file select, fetch content and show read-only preview (no edit/save)
- [x] 3.4 Handle loading and error states (OpenCode down, binary/unsupported)

## 4. Verification

- [x] 4.1 Run targeted unit tests for path helper / API filtering
- [x] 4.2 Manually or via smoke: OpenCode agent shows toggle; non-OpenCode does not; expand + preview works
- [x] 4.3 Mark OpenSpec tasks complete; `openspec validate opencode-workspace-file-tree`
