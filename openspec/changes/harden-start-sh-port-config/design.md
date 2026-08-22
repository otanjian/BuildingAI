## Context

`start.sh` currently keeps a `DEV_PORTS` array and API health URL separate from the environment
values passed to the child launchers. The implementation must preserve the existing dev workflow and
avoid changing service defaults.

## Goals / Non-Goals

**Goals:** derive the managed port list from `SERVER_PORT` and `CLIENT_DEV_PORT`, centralize the API
base URL, load both values from `.env`, and cover the contract with a no-server shell test.

**Non-Goals:** changing Vite/Nest configuration, production deployment, or OpenCode/SAP ports.

## Decisions

Use a small `refresh_dev_ports` helper after environment loading and before any port operation. Use
an `api_url` helper for API health and user-facing output. Keep the existing defaults as fallback
values so existing commands remain compatible.

Rejected alternative: editing only the child PM2 environment. That would leave `ensure_ports_available`,
`status`, and readiness checks targeting stale fixed ports.

## Risks / Trade-offs

- [Risk] A caller changes port variables after startup initialization. → [Mitigation] Refresh the
  port array before startup and status operations, while helpers read the current variables directly.
- [Risk] A custom API port conflicts with another process. → [Mitigation] Existing busy-port checks
  now inspect the configured port list.
