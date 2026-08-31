# buildingai-console-mcp Specification

## Purpose
TBD - created by archiving change buildingai-console-mcp. Update Purpose after archive.
## Requirements
### Requirement: MCP endpoint identity and protocol
The system SHALL expose an in-process HTTP MCP server identified as `buildingai-console-mcp` that supports MCP JSON-RPC methods `initialize`, `tools/list`, and `tools/call`. Unauthenticated requests MUST be rejected. Authenticated requests MUST be bound to the user owning the Console MCP API key presented in `Authorization: Bearer`.

#### Scenario: Successful initialize with valid key
- **WHEN** a client calls `initialize` with a valid, non-revoked Console MCP API key
- **THEN** the server returns success and advertises server name `buildingai-console-mcp`

#### Scenario: Reject missing or invalid key
- **WHEN** a client calls any MCP method without a Bearer key, with an unknown key, or with a revoked key
- **THEN** the server rejects the request and MUST NOT execute any tool

### Requirement: Permission-gated tool discovery
The system SHALL maintain a deny-by-default phase-1 tool whitelist. For `tools/list`, the server MUST return only tools for which the authenticated user currently satisfies the tool's required permission check(s). Root users MUST see all phase-1 tools (same bypass semantics as console `PermissionsGuard`).

#### Scenario: User without agents list permission
- **WHEN** an authenticated non-root user lacks permission code `agents:list`
- **THEN** `tools/list` MUST NOT include the console agents list tool

#### Scenario: User with agents list permission
- **WHEN** an authenticated user has permission code `agents:list` (or is root)
- **THEN** `tools/list` MUST include the console agents list tool

### Requirement: Permission-gated tool execution
On `tools/call`, the system MUST re-check the calling user's permissions for the named tool before executing. If the check fails, the system MUST refuse execution and return an explicit permission-denied error (including which permission codes were required when applicable). The system MUST NOT execute side effects after a failed check.

#### Scenario: Call tool without permission
- **WHEN** a user invokes a tool whose required permissions they do not hold
- **THEN** the server returns `permission_denied` and MUST NOT mutate platform data

#### Scenario: Call tool with permission
- **WHEN** a user invokes a tool whose required permissions they hold
- **THEN** the server executes via the same service layer used by the corresponding product API and returns the tool result

### Requirement: Phase-1 tool whitelist
Phase 1 MUST include at least:
- Console agents list (requires `agents:list`)
- Console MCP servers list (requires the same permission code used by console `ai-mcp-servers` list)
- Agent create for the authenticated user (requires a valid authenticated user identity, matching web agent creation; no console `@Permissions` code today)
- Optional additional read-only tools that map 1:1 to existing console list/get endpoints and their permission codes

Phase 1 MUST NOT expose user/role/permission mutation, extension install, or arbitrary unrestricted SQL.

#### Scenario: Create agent via MCP
- **WHEN** an authenticated user calls the agent-create tool with a valid create payload
- **THEN** the system creates an agent owned by that user using the same service path as web agent creation

#### Scenario: Unknown tool name
- **WHEN** a client calls a tool name outside the phase-1 whitelist
- **THEN** the server refuses with an error and MUST NOT execute anything

### Requirement: Distinct from product MCP catalog UX
The platform MUST treat `buildingai-console-mcp` as the first-party control-plane MCP name and MUST NOT conflate it with user-configured third-party entries in `ai-mcp-servers` management UX copy or registration identity.

#### Scenario: System registration name
- **WHEN** the platform registers or seeds the control-plane MCP server record
- **THEN** its canonical name is `buildingai-console-mcp`

