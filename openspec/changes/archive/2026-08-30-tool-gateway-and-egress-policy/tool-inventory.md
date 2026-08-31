# Initial tool inventory

The gateway ships a resettable sandbox catalog used by browser acceptance:

| Tool | Risk | Capability | Approval | Idempotency | Egress |
| --- | --- | --- | --- | --- | --- |
| `sandbox-read` | READ | `sandbox`, `read` | none | no | no outbound URL by default |
| `sandbox-write` | WRITE | `sandbox`, `write` | approval | required | no outbound URL by default |
| `sandbox-ssrf` | READ | `sandbox`, `network` | none | no | URL is checked against allowlist/private-network rules |

Existing Bowi/MCP adapters remain inventoried as external adapters and must be registered with a tenant-scoped `ToolDefinition` before being enabled for a released Agent version. The gateway's default is `TOOL_NOT_REGISTERED`, so an unregistered legacy name cannot silently execute.
