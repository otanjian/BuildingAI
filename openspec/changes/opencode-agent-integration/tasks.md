## 1. OpenCode runtime & config

- [x] 1.1 Confirm OpenCode binary/serve on this host; start `opencode serve` against workspace `/home/opencode/opencode` (port 4096); note auth env if any
- [x] 1.2 Ensure `artifacts/` exists under the workspace and is ignored from VCS if appropriate; document default `OPENCODE_BASE_URL`
- [x] 1.3 Spike OpenCode session create, `prompt_async`, `/event` shapes against live `/doc` and record mapping notes for the adapter

## 2. Agent createMode & backend provider

- [x] 2.1 Extend Agent DTOs/enums/`CREATE_MODE_MAP`/console-mcp catalog to accept `createMode: "opencode"` and `thirdPartyIntegration.opencode` config
- [x] 2.2 Add `OpencodeApiService` (HTTP/SDK client): health, session create/abort, prompt_async, event stream, optional file read
- [x] 2.3 Add `OpencodeChatProvider` modeled on Dify: local conversation persistence, session mapping, UI Message Stream pipe
- [x] 2.4 Wire `AgentChatCompletionService` branch for `createMode === "opencode"`; support stop/abort
- [x] 2.5 Map OpenCode events to `text-delta` and `tool-*` parts (read/write/edit/bash) with output truncation; persist parts on assistant message

## 3. L2 artifacts & HTML preview API

- [x] 3.1 Implement artifact root resolution `artifacts/{conversationId}` and detect HTML entry (`index.html` or first html)
- [x] 3.2 Emit `data-artifact` stream part with authenticated preview URL when HTML is ready
- [x] 3.3 Add authenticated `GET .../conversations/:conversationId/artifacts/*` with path-traversal protection and conversation authz
- [x] 3.4 Unit tests for path safety and conversation isolation of artifact roots

## 4. Client workbench UI

- [x] 4.1 Allow creating/editing OpenCode-mode Agent in console UI (mode selector + opencode config fields)
- [x] 4.2 Render `data-artifact` / artifact parts in Agent chat with `WebPreview` iframe
- [x] 4.3 Verify streaming tool steps display via existing `GenericTool` / collapse-completed behavior; fix gaps if OpenCode tool names need aliases

## 5. Workspace guidance & verification

- [x] 5.1 Add or update workspace guidance (e.g. AGENTS snippet / agent default prompt) so reports write under `artifacts/{conversationId}/`
- [ ] 5.2 End-to-end manual verification: new chat → stream tools → HTML iframe; resume history; second conversation isolated artifacts
- [x] 5.3 Run targeted lint/typecheck/tests for touched packages; fix regressions
