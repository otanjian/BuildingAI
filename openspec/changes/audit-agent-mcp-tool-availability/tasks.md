## 1. Audit current configuration

- [x] 1.1 Verify the target agent has both Doris and Bowi MCP server bindings and capture the live Doris child-capability manifest.
- [x] 1.2 Classify unavailable children by provider, permission, version, and capability state without changing Doris.

## 2. Configure safe fallback policy

- [x] 2.1 Append capability discovery, no-retry, evidence-only, and Doris-to-Bowi fallback rules to the target agent role prompt in BuildingAI.
- [x] 2.2 Verify the persisted agent configuration preserves both MCP server bindings and the existing todo ownership rules.

## 3. Verify behavior

- [x] 3.1 Run direct Doris MCP manifest and read-only query smoke tests and confirm callable children succeed.
- [x] 3.2 Validate the OpenSpec change and record the final configured-versus-unavailable counts.
