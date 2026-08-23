## Why

Bowi AI is intended to be the single trusted business-tool entry point, but OpenCode currently connects directly to separate SAP ADT and PyRFC MCP servers with different transports, credentials, session models, and tool catalogs. This exposes infrastructure details to agents, duplicates SAP tools, bypasses Bowi authorization and auditing, and leaves the ADT SSE gateway vulnerable to multi-client crashes.

### Why now

Todo has established the first-party Bowi provider model, while SAP is already used through two direct MCP integrations. Consolidating SAP now prevents those direct contracts and credential flows from becoming permanent platform dependencies.

### Non-goals

- Reimplementing the SAP ADT or NW RFC SDK protocols inside the main API.
- Combining the ADT and PyRFC runtimes into one process.
- Publishing all upstream SAP tools without review.
- Removing direct SAP endpoints needed for administrator diagnostics.

## What Changes

- Add a first-party SAP domain provider to `bowi-mcp` with curated, capability-classified ADT and RFC tools.
- Add remote MCP adapters that keep ADT and PyRFC as isolated upstream runtimes while hiding transport sessions and PyRFC `connection_id` values from callers.
- Resolve SAP connection profiles from the verified Bowi principal and bind every cached upstream handle to that subject.
- Enforce read, write, transport, debug, and unrestricted-RFC capabilities independently; default discovery exposes only the approved catalog.
- Return sanitized, stable Bowi tool results and structured audit context without logging secrets or full business payloads.
- Replace the unstable ADT SSE gateway with stateful Streamable HTTP and exact runtime versions.
- **BREAKING**: managed OpenCode uses only `bowi-mcp` for normal SAP access; ordinary OpenCode configuration no longer registers direct `sap-abap` or `sap-pyrfc` entries. Administrators add a direct entry temporarily only for explicit diagnostics.
- Add an automatically discoverable OpenCode skill and align managed-session instructions so Todo and SAP business requests use Bowi, while direct SAP MCP calls follow explicit administrator-diagnostic lifecycles.

## Capabilities

### New Capabilities

- `bowi-mcp-sap-gateway`: Secure unified discovery and execution of curated SAP ADT and PyRFC capabilities through Bowi MCP.

### Modified Capabilities

- None.

## Impact

- Main API Bowi MCP registry, principal capability model, SAP provider, upstream MCP client lifecycle, configuration, and tests.
- SAP ADT gateway startup transport and health behavior.
- Managed OpenCode MCP configuration and SAP credential injection behavior.
- OpenCode project skill routing and BuildingAI managed-session usage instructions.
- Deployment configuration for SAP upstream URLs, profile credentials, timeouts, session limits, and capability grants.
