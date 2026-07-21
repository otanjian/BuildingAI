## Why

External agents (Cursor, Claude, platform agents) cannot safely operate BuildingAI the way a logged-in console user can. Today, product MCP is for *calling third-party tools from chat*, and agent publish API keys intentionally bypass console RBAC. We need a first-party control-plane MCP that executes the same console-facing operations under the **calling user's** permissions and refuses unauthorized calls.

**Why now:** Local/dev and embed workflows already need AI-assisted console work (list agents, create agents, inspect MCP servers). Doing this without a permission-aware MCP either requires sharing admin JWTs or inventing ad-hoc scripts that drift from UI authorization.

## What Changes

- Add in-process HTTP MCP server named **`buildingai-console-mcp`** (JSON-RPC: `initialize`, `tools/list`, `tools/call`), hosted by the main API (same pattern family as extension `bowi-mcp`, but main-site only)
- Introduce **user-bound Console MCP API keys** (create / list / revoke in console); keys authenticate MCP requests and resolve to a real user whose role permissions are checked live
- Phase-1 tool whitelist: high-value **read** tools plus **agent create**; each tool declares required permission code(s); missing permission → tool omitted from `tools/list` and `tools/call` returns explicit `permission_denied`
- Register `buildingai-console-mcp` as a system MCP server for discoverability; keep naming distinct from user-configured `ai-mcp-servers`
- Reuse existing services / RBAC (`RolePermissionService`, `group:action` codes)—do not invent a parallel permission model

**Non-goals**

- Full mirror of every console HTTP endpoint (no tool explosion in v1)
- Extension console operations (`ehcs@…` etc.)—remain on extension MCPs such as `bowi-mcp`
- Reusing agent publish API keys (`permissions: []`) for this MCP
- OAuth device-code / paste-JWT as primary auth (keys only in phase 1)
- Impersonation / service-account “act as another user”

## Capabilities

### New Capabilities

- `buildingai-console-mcp`: In-process platform MCP endpoint, tool catalog, permission gating, and execution against console-equivalent services
- `console-mcp-api-keys`: User-scoped MCP API keys (lifecycle, binding to user, auth for MCP requests)

### Modified Capabilities

- （无）Existing `openspec/specs/` are EHCS-domain; this change adds platform control-plane capabilities without modifying those requirements

## Impact

- **API:** New MCP route(s) under main app; console APIs for MCP key management; optional system MCP seed/registration
- **DB:** New table (or equivalent) for console MCP API keys (hashed secret, user id, label, revoked_at, last_used_at)
- **Auth:** New credential type for MCP; must load full user permissions like JWT console sessions (not agent-key playground)
- **Console UI:** Minimal key management (create/copy once/revoke)—can be settings or MCP/ops page
- **Clients:** Cursor / agents configure SSE or streamable-HTTP URL + `Authorization: Bearer <mcp_key>`
- **Security:** Deny-by-default tool whitelist; never log raw keys; revoke must take effect immediately
