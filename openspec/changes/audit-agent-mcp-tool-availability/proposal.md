## Why

The enterprise operations monitoring agent is bound to the Doris and Bowi MCP servers, but the Doris server exposes optional child capabilities with different runtime availability. The agent currently treats an unavailable semantic capability as a missing configuration and can retry it, which obscures the usable data path and prevents reliable fallback. This needs to be corrected now so operational analyses report capability gaps accurately and still produce data-backed todos.

## What Changes

- Add a capability-aware operating policy to the enterprise operations monitoring agent configuration.
- Require runtime discovery of Doris child-tool availability before invoking a child capability.
- Add deterministic fallback from unavailable semantic, ADBC, permission-gated, or version-gated capabilities to callable Doris catalog/query tools.
- Preserve the existing Doris and Bowi server bindings and todo workflow.
- Record the current capability audit and distinguish BuildingAI binding gaps from Doris-side provider or privilege gaps.

## Capabilities

### New Capabilities

- `agent-mcp-capability-fallback`: Make MCP-backed agents discover child-tool availability and degrade safely when optional capabilities are unavailable.

### Modified Capabilities

<!-- No existing spec requirements are changed. -->

## Impact

- BuildingAI agent configuration for `企业经营监控与分析` in the local PostgreSQL database.
- No Doris source files, permissions, schemas, or data are changed.
- No new external dependency is required; existing MCP discovery and query tools are used.
