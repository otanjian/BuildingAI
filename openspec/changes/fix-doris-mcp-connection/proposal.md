## Why

The enterprise monitoring agent cannot analyze procurement data because the Doris MCP server is being reached through an outdated client path. The failed fallback also stores an oversized transport error in a 255-character field, masking the original diagnosis with a second database error. Why now: Doris is running and advertises a usable modern protocol, so the agent should be recoverable without changing Doris data or prompts.

## What Changes

- Ensure modern Doris Streamable HTTP negotiation and request envelopes are used by every BuildingAI runtime path.
- Keep compatibility with legacy HTTP/SSE MCP servers while preventing modern endpoints from being incorrectly downgraded.
- Normalize connection failures before persisting them so a failed check cannot trigger a database validation error.
- Add regression coverage for modern Doris discovery/tool listing and bounded connection error persistence.

## Capabilities

### New Capabilities

- `doris-mcp-connection-reliability`: Reliably connect to the configured Doris MCP endpoint and report actionable, persistable status.

### Modified Capabilities

## Impact

- Shared MCP client package and its built/runtime artifacts.
- API MCP connection-check services and database entity/migration handling for `connectError`.
- No Doris server, SQL schema, agent prompt, or user-facing report format changes.

## Non-goals

- Changing Doris MCP tools, database contents, or server version.
- Adding a new procurement analytics implementation; this change restores the existing tool path.
