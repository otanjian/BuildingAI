## 1. Data model & keys API

- [x] 1.1 Add Console MCP API key entity (userId, label, keyHash, keyPrefix, revokedAt, lastUsedAt) and register in DB module
- [x] 1.2 Implement key service: generate secret, hash at rest, create/list/revoke for owning user; never return hash or raw secret on list
- [x] 1.3 Add console HTTP endpoints for create / list / revoke own keys with AuthGuard (JWT)
- [x] 1.4 Add unit or integration tests for create → authenticate hash → revoke rejects

## 2. MCP auth & runtime shell

- [x] 2.1 Create `console-mcp` Nest module with JSON-RPC dispatcher (`initialize`, `tools/list`, `tools/call`) modeled after `bowi-mcp` runtime
- [x] 2.2 Implement MCP Bearer key guard: resolve user + live permissions; reject missing/invalid/revoked/disabled
- [x] 2.3 Expose HTTP route for `buildingai-console-mcp` and ensure middleware/guards allow the path without JWT while requiring MCP key
- [x] 2.4 Verify `initialize` returns server name `buildingai-console-mcp`

## 3. Permission-gated tools (phase 1)

- [x] 3.1 Define tool catalog with required permission codes / auth rules for `console_list_agents`, `console_list_mcp_servers`, `create_agent`
- [x] 3.2 Implement `tools/list` filtering via `RolePermissionService` (root sees all phase-1 tools)
- [x] 3.3 Implement `tools/call` re-check + `permission_denied` without side effects on failure
- [x] 3.4 Wire `console_list_agents` to console list service path (`agents:list`)
- [x] 3.5 Wire `console_list_mcp_servers` to console MCP servers list service path
- [x] 3.6 Wire `create_agent` to `AgentsService.createAgent` with web create DTO validation
- [x] 3.7 Add tests: list hides unauthorized tools; call without permission fails; create agent succeeds for authenticated user

## 4. System registration & console UI

- [x] 4.1 Seed or upsert system MCP server record named `buildingai-console-mcp` pointing at the new endpoint
- [x] 4.2 Add minimal console UI to create/copy-once/revoke own Console MCP API keys
- [x] 4.3 Add short operator doc snippet (Cursor URL + Bearer header example) in change verification notes or README section

## 5. Verification

- [ ] 5.1 Manual: create key → MCP `tools/list` / `tools/call` with key; revoke → requests fail
- [ ] 5.2 Manual: non-privileged role cannot list agents tool; privileged role can
- [x] 5.3 Run targeted API tests / typecheck for touched packages
- [x] 5.4 `openspec validate buildingai-console-mcp` (or project equivalent) and mark tasks complete
