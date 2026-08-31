## Why

The Doris MCP endpoint is reachable, but its business semantic layer and optional Ossie provider are not configured. As a result, `doris_semantic` cannot provide validated business models, while the enterprise monitoring agent must fall back to raw SQL and cannot consistently enforce metric grain, dimensions, and aggregation rules.

## What Changes

- Publish the existing SAP business metadata tables and MCP read-only views in `sap_meta`.
- Grant the Doris MCP read-only account access to the published semantic layer.
- Add a bounded Ossie semantic model and binding manifest for the Doris ERP datasets used by enterprise monitoring.
- Enable and validate the Doris MCP Ossie adapter while leaving MetricFlow and ADBC disabled.
- Add explicit Doris MCP connection, readiness, and semantic capability verification.
- Preserve BuildingAI’s capability discovery and fallback behavior for unsupported Doris 2.1.9 features.

## Capabilities

### New Capabilities

- `doris-semantic-mcp-runtime`: Expose validated SAP ERP semantic models through the Doris MCP server with read-only physical bindings.

### Modified Capabilities

<!-- No existing repository capability requirements are modified. -->

## Impact

- Doris SQL metadata objects and the dedicated MCP database user.
- Doris MCP runtime configuration and local semantic model assets.
- BuildingAI remains a consumer; its existing Doris and Bowi bindings are preserved.
- MetricFlow, ADBC, Doris version upgrades, and write/administration tools remain out of scope.
