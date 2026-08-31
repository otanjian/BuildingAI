## Why

Foreground development startup leaves an old `.run/dev.pid` from an earlier detached run, so `./start.sh status` reports a stale managed process even while the API and web servers are healthy. This makes the operator-facing status misleading and can undermine confidence in later stop or restart operations.

### Why now

The issue was reproduced during a fresh full-stack startup and is directly visible in the supported `start.sh status` workflow.

### Non-goals

- Changing the PM2 lifecycle for detached development servers.
- Changing service ports, health endpoints, or application runtime behavior.
- Addressing unrelated application warnings emitted after startup.

## What Changes

- Remove legacy development PID files before launching the foreground development command.
- Preserve detached-mode PID tracking and existing stop behavior.
- Add a shell contract test that proves foreground startup cannot retain detached PID metadata.

## Capabilities

### New Capabilities

- `start-script-process-status`: Defines truthful PID status behavior when switching between detached and foreground development startup.

### Modified Capabilities

None.

## Impact

- Affected code: root `start.sh` and a focused shell contract test under `scripts/`.
- No API, database, dependency, or production runtime changes.
