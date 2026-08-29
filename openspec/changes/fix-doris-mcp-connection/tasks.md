## 1. Compatibility tests

- [x] 1.1 Add shared-client tests for modern discovery selection, modern tool listing/calls, and preservation of configured headers.
- [x] 1.2 Add regression tests proving legacy HTTP and SSE transports still use the existing AI SDK path when modern discovery is unsupported.
- [x] 1.3 Add API service tests proving connection errors are bounded for persistence while the full error remains available to logs/response handling.

## 2. MCP runtime implementation

- [x] 2.1 Make modern protocol selection explicit and select it only for a valid advertised version, preserving legacy fallback for malformed/unsupported responses.
- [x] 2.2 Ensure the modern client preserves caller headers, uses required `_meta` fields, parses JSON/SSE responses, and normalizes tool results without changing the public `McpClient` interface.
- [x] 2.3 Keep legacy HTTP/SSE fallback behavior unchanged for servers that do not support the modern protocol.

## 3. API diagnostics and runtime packaging

- [x] 3.1 Bound `connectError` at the API persistence boundary and cover the 255-character database constraint.
- [x] 3.2 Ensure the shared SDK build/runtime output is refreshed before API startup so source and loaded packages use the same compatibility logic.

## 4. Verification

- [x] 4.1 Run focused AI SDK and API tests plus package typecheck/build.
- [x] 4.2 Validate the live Doris endpoint (`/live`, modern discovery, `tools/list`) and run the MCP connection check without changing Doris.
- [x] 4.3 Run `openspec validate fix-doris-mcp-connection` and update this task list with verification results.

Verification notes: AI SDK client/modern HTTP tests (6 passed), API MCP utility test (2 passed), AI SDK/API typechecks and builds passed, `bash -n start.sh` and Doris launcher contract tests passed, and the live Doris `/live` plus modern client `tools/list` smoke check returned 8 tools. When the reported failure occurred, Colima/Docker was stopped, so the Doris MCP process was alive but `/ready` returned 503 and `127.0.0.1:9030` was not listening. The existing BuildingAI Doris lifecycle was used to start the unchanged sibling FE/BE Compose services and restart the MCP process after the database became ready. Final verification returned `/ready` 200 with `doris: ready`, detected Doris `2.1.9`, and a read-only `doris_query.execute_query` call returned `connectivity_check = 1`. The user-facing setup guide distinguishes `/live` process liveness from `/ready` data readiness.
