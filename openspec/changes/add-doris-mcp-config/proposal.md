## Why

The local MCP template does not expose the Doris MCP server, so developers must re-enter its endpoint manually. Adding the existing Doris Streamable HTTP endpoint makes it immediately discoverable by compatible MCP clients.

## What Changes

- Add a `doris` entry to the root `mcp.json` template using Streamable HTTP.
- Document how to start Doris and connect to its local MCP endpoint.

## Capabilities

### New Capabilities

- `doris-mcp-client-config`: Provide a ready-to-use HTTP configuration for the Doris MCP server.

### Modified Capabilities

## Impact

- `mcp.json` and Chinese usage documentation only.
- No BuildingAI API, database schema, console MCP entity, or Doris runtime code is changed.

## Non-goals

- Changing Doris MCP tools or database behavior.
- Starting Doris automatically.
