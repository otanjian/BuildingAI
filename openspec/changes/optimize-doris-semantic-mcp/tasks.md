## 1. Inspect and publish metadata

- [x] 1.1 Inspect the live Doris version, databases, and ERP tables; select only existing read-only physical objects for semantic bindings.
- [x] 1.2 Apply the existing `sap_meta` DDL, seed, and MCP views idempotently.
- [x] 1.3 Grant `doris_ai_mcp` read-only access to `sap_meta` and verify the MCP views are readable.

## 2. Configure Ossie semantic runtime

- [x] 2.1 Generate a schema-valid Ossie model and binding manifest using verified ERP tables and bounded read-only settings.
- [x] 2.2 Validate the model and manifest against the installed Doris MCP Ossie loader before enabling them.
- [x] 2.3 Update Doris MCP environment configuration to enable Ossie and keep MetricFlow/ADBC disabled.

## 3. Restart and verify

- [x] 3.1 Restart the Doris MCP service without modifying BuildingAI source code or database bindings.
- [x] 3.2 Verify readiness, semantic manifest availability, model summary/context, and a read-only Doris query.
- [x] 3.3 Record remaining unavailable capabilities and validate this OpenSpec change.
