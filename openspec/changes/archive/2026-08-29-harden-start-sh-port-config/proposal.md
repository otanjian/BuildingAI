## Why

The launcher advertises configurable API and web ports, but several readiness, port-freeing, and
status paths still use fixed `4090`/`4091` values. This can make a custom `.env` appear started while
health checks target the wrong process.

## What Changes

- Load `SERVER_PORT` and `CLIENT_DEV_PORT` from the root environment.
- Use those values consistently for readiness, status, port cleanup, and displayed URLs.
- Add a shell contract test covering custom port propagation.

## Capabilities

### New Capabilities

- `start-sh-port-configuration`: Consistent configurable API and web port orchestration.

### Modified Capabilities

- None.

## Impact

Only `start.sh` and its contract tests are affected. Existing defaults remain API `4090` and web
`4091`; no service API or persisted data changes are required.

## Non-goals

- Changing the default ports.
- Changing production deployment manifests or application-level CORS configuration.
