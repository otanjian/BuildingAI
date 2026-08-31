## Why

The Doris data platform currently has its own Docker FE/BE services, a static knowledge-hub frontend, and an HTTP Doris MCP server, but they are outside the BuildingAI startup lifecycle. Developers must start three pieces manually and can easily get a partially running or misconfigured local stack. Why now: Doris is already provisioned beside this repository and is ready to be managed as one local dependency.

## What Changes

- Add an opt-in `doris` target to `start.sh` that starts and stops the Doris FE/BE Docker services, the Doris knowledge-hub frontend, and the Doris MCP server.
- Include Doris services in `all` start/restart/stop flows when enabled, while preserving the existing default behavior when Doris is not configured.
- Add configurable paths, ports, transport, and Docker enablement through the root environment.
- Add status and log visibility for the Doris components and wait for their health/readiness endpoints before reporting success.

## Capabilities

### New Capabilities

- `doris-local-stack`: Manage the local Doris FE/BE, knowledge-hub frontend, and Doris MCP services through the project launcher.

### Modified Capabilities

- None.

## Impact

- `start.sh`, root environment examples, and startup documentation.
- The sibling `../doris` workspace, its Docker Compose project, static frontend, and `db/start-doris-mcp.sh` runtime.
- No production APIs or database schemas are changed. Doris remains opt-in to avoid changing existing developer startup behavior.

## Non-goals

- Changing Doris SQL schemas, MCP tool behavior, or the Doris Docker images.
- Deploying Doris to production or replacing the existing Docker Compose definition.
