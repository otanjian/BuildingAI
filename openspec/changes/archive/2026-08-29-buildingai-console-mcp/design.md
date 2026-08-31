## Context

BuildingAI already has:
- Console RBAC: JWT → `AuthGuard` → `PermissionsGuard` with codes like `agents:list` (`RolePermissionService`)
- Product MCP: user-configured servers attached to agents for chat tools
- Extension precedent: `bowi-mcp` JSON-RPC HTTP MCP inside Nest (EHCS domain)
- Agent publish API keys: Bearer → agent creator, but `permissions: []` (unsuitable for console RBAC)

This change adds a **first-party control-plane MCP** so external clients can perform selected console-equivalent operations as a real user, gated by that user's permissions.

## Goals / Non-Goals

**Goals:**
- In-process MCP named `buildingai-console-mcp`
- Auth via user-bound Console MCP API keys (mode B)
- Phase-1 whitelist: read tools + agent create; permission check before execute; omit unauthorized tools from `tools/list`
- Reuse service layer + `RolePermissionService` (same codes as console)

**Non-Goals:**
- Full console API surface as tools
- Extension console MCP coverage
- OAuth / paste-JWT primary auth
- Reuse of agent publish API keys
- Impersonation

## Decisions

### 1. Host MCP in main API process (Option 1)
**Choice:** Nest module under `packages/api` (e.g. `modules/console-mcp/`), HTTP JSON-RPC similar to `bowi-mcp`.  
**Why:** Direct DI of services and `RolePermissionService`; single deploy unit; matches existing SSE/HTTP MCP client expectations.  
**Alternatives:** Separate Node MCP process (cleaner isolation, worse auth coupling); thin proxy-only MCP (still needs identity + permission logic somewhere).

### 2. Auth: Console MCP API keys, not JWT paste or agent keys
**Choice:** New credential type stored hashed, bound to `userId`; MCP `Authorization: Bearer <key>`.  
**Why:** Safe for Cursor long-lived config; revocable; maps to full user permissions.  
**Alternatives:** User JWT in MCP config (expiry + leakage); agent publish key (empty permissions).

**Auth flow:**
```
Bearer mcp_key → lookup hash → load User → reject if revoked/disabled
  → hydrate permissions via RolePermissionService / same path as validateToken
  → attach UserPlayground for tool handlers
```

### 3. Permission model
| Tool family | Gate |
|-------------|------|
| Console list agents | `agents:list` |
| Console list MCP servers | console `ai-mcp-servers` list permission code (as scanned: `ai-mcp-servers:list`) |
| Create agent | Authenticated user only (mirrors `POST /api/ai-agents`; no console `@Permissions` today) |
| Future console writes | Exact `@Permissions` codes on corresponding console handlers |

**Listing policy:** hide tools the user cannot call.  
**Call policy:** still re-check (TOCTOU / stale list).  
**Root:** same bypass as `PermissionsGuard`.

### 4. Phase-1 tool catalog (initial)
Suggested tool names (English identifiers):
- `console_list_agents` → `AgentsService.listForConsole` (+ thin mapping like console controller)
- `console_list_mcp_servers` → existing MCP server list service used by console
- `create_agent` → `AgentsService.createAgent(user, dto)` with web `CreateAgentDto` fields

Add more read tools only if they map cleanly to one permission code and one service method.

### 5. Routing and registration
- MCP HTTP path e.g. `/mcp/buildingai-console-mcp` (or under web prefix if required by existing middleware—prefer a path that `ExtensionGuard` allows, analogous to how open/public MCP routes are treated)
- Mark controller appropriately so login JWT is not required; **MCP key guard** is the auth
- Seed/register system `ai_mcp_servers` row named `buildingai-console-mcp` with communication type matching the endpoint (SSE or streamable-HTTP) for in-product discoverability; do not auto-bind to all agents

### 6. Key management API / UI
- Console (or settings) endpoints: create / list / revoke own keys
- Permission: authenticated user managing own keys; optionally gate behind a small permission later—phase 1: any logged-in console-capable user may manage **own** keys
- UI: show prefix + created/last used; copy secret once on create

### 7. Error shape
MCP tool errors use a stable code:
- `unauthorized` — bad/missing/revoked key
- `permission_denied` — authenticated but lacks required codes
- `invalid_params` / `internal_error` — validation / unexpected

Never return stack traces or raw SQL to clients.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| MCP key becomes remote admin for high-privilege users | Phase-1 whitelist; no role/user mutation tools; document key storage hygiene |
| Confused with product MCP | Distinct name `buildingai-console-mcp`; UI copy clarifies “control plane” |
| Agent create has no console permission code | Document as “authenticated user”; consider adding `agents:create` later if product wants console parity |
| ExtensionGuard / public path mistakes | Explicit allowlist for MCP path in guard/middleware tests |
| Key theft | Hash at rest; revoke; optional last_used_at monitoring; never log secret |

## Migration Plan

1. Ship DB entity + migration/sync for keys table
2. Ship MCP module + key APIs behind feature flag or default-on in development
3. Seed system MCP server record
4. Ship minimal console UI for keys
5. Document Cursor config (`url` + Bearer header)
6. Rollback: disable route + revoke all keys; table can remain

## Open Questions

- Exact transport for Cursor: SSE vs streamable-HTTP (follow whatever `@buildingai/ai-sdk` MCP client already prefers for HTTP servers)
- Whether create-agent should later require a new console permission `agents:create`
- Whether root admins need console UI to revoke **other** users' MCP keys in phase 1 (currently out of scope)
