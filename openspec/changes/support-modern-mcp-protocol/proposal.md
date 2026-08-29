## Why

BuildingAI currently treats every Streamable HTTP MCP endpoint as a legacy handshake client. Doris exposes the modern MCP `2026-07-28` request-envelope protocol, so it is reachable over HTTP but is reported as unavailable and cannot provide tools to agents. This must be fixed now so the new enterprise monitoring agent can use Doris without changing the Doris service.

## What Changes

- Add modern MCP protocol negotiation for Streamable HTTP connections.
- Keep legacy MCP handshake support for existing SSE/Streamable HTTP servers.
- Detect the server protocol and use the matching request/response envelope for tool discovery and calls.
- Surface useful connection errors when a server advertises an unsupported protocol.
- Add automated coverage for modern initialization, tool listing, tool calls, and legacy compatibility.

## Capabilities

### New Capabilities

- `modern-mcp-streamable-http`: Connect to modern MCP Streamable HTTP servers using the stateless request-envelope protocol.

### Modified Capabilities

- None.

## Impact

- `packages/@buildingai/ai-sdk` MCP client and its callers.
- MCP connection checking and agent tool discovery that use the shared client.
- No Doris files, process configuration, or external MCP server behavior changes.

## Non-goals

- Supporting arbitrary future protocol versions without explicit compatibility logic.
- Changing MCP server records, agent configuration data, or the Doris server.
