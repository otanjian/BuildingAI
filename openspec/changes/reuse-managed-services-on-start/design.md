## Context

`start.sh` starts optional Doris services and detached API/web services through PM2, then checks ports before launching. Port checks do not distinguish managed healthy processes from unrelated listeners.

## Decisions

- Query PM2 for the named process, verify its PID is alive, and run the existing HTTP readiness probe.
- Short-circuit only for non-force startup; `-f` and `restart` retain replacement semantics.
- Keep PID files refreshed when reusing a process so status/stop commands remain accurate.
- For detached dev startup, require both PM2 processes and API/proxy probes before reusing them.

## Risks

- A stale PM2 name could mask a wrong process; PID liveness plus endpoint probes limit this risk.
- Foreground `dev` startup remains unchanged because it is intentionally an attached process.
