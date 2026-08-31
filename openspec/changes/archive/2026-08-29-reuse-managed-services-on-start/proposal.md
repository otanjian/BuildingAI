## Why

Running `./start.sh` repeatedly currently treats healthy services already managed by PM2 as external port conflicts. This makes the documented default startup fail unless the user forces a restart, even though the stack is healthy.

## What Changes

- Reuse healthy PM2-managed Doris web/MCP services during normal startup.
- Reuse a healthy detached BuildingAI API/web pair during `./start.sh -d`.
- Preserve force/restart behavior for intentional service replacement and restart unhealthy services when probes fail.

## Capabilities

### New Capabilities

- `idempotent-startup`: Repeated startup commands safely reuse healthy managed services.

### Modified Capabilities

None.

## Impact

- `start.sh` startup orchestration and PM2 process detection.
- Adds no application dependencies or API changes.
