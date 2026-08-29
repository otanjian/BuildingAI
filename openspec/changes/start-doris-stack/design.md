## Context

The sibling `../doris` workspace already provides the three runtime pieces: `docker-compose.yml` for FE/BE, a static `index.html` knowledge hub, and `db/start-doris-mcp.sh` for the official Doris MCP server. The existing `start.sh` already has target-specific lifecycle functions, `.run` PID/log metadata, port checks, and optional Docker infrastructure handling.

## Goals / Non-Goals

**Goals:**

- Reuse the existing Doris scripts and Compose definition rather than duplicating runtime logic.
- Make Doris lifecycle operations idempotent and isolated from the BuildingAI stack.
- Use PM2 for the static frontend and MCP process so they survive shell exit and have consistent logs.
- Keep the default `start.sh` path backward compatible, with explicit opt-in for Doris in `all`.

**Non-Goals:**

- Modifying the sibling Doris project or its database/MCP implementation.
- Adding a new web framework or proxy layer for the static knowledge hub.

## Decisions

1. **Doris target and opt-in all integration.** Add `doris` as a first-class target. `START_DORIS=false` remains the default; `START_DORIS=true` includes Doris in `all`. This avoids imposing Docker and Python requirements on existing users.

2. **Compose ownership marker.** Run `docker compose -f "$DORIS_COMPOSE_FILE" up -d fe be` and create `.run/doris-docker.started` only after the command succeeds. Stop uses the marker and the same Compose file to stop only `fe` and `be`, never `docker compose down` or unrelated containers.

3. **Frontend process.** Serve the sibling directory with Python's standard HTTP server from `DORIS_WORKSPACE_DIR`, recording `.run/doris-web.pid` and `.run/doris-web.log`. This is appropriate because the frontend is a static `index.html` site and avoids a new dependency.

4. **MCP process.** Start `db/start-doris-mcp.sh` through PM2 as `doris-mcp`, passing `SERVER_PORT=DORIS_MCP_PORT` and writing `.run/doris-mcp.log`. The existing script loads Doris credentials from `db/.env`; no credentials are copied into the root environment.

5. **Readiness and cleanup.** Add bounded HTTP probes for FE (`:8030`), MCP `/live`, and the frontend root. Use `lsof` for process port ownership and existing PID-file helpers for cleanup. Readiness failures return non-zero for an explicit `doris` target but remain non-fatal when `all` is starting optional Doris.

6. **Docker runtime recovery.** Before starting Docker-backed infra, detect the active Docker context. If it is the local `colima` context and the daemon is unavailable, invoke `colima start` and retry the Docker health check. Other contexts are never started implicitly, so Docker Desktop and remote contexts remain user-controlled.

7. **Testing.** Add shell contract tests for argument parsing, opt-in behavior, target dispatch, configurable ports, Docker runtime recovery, and syntax. In verification, use Docker/HTTP probes when Docker is available and skip only the unavailable external runtime checks.

## Risks / Trade-offs

- [Docker unavailable] → Report a clear warning and leave other BuildingAI services unaffected; explicit `doris` returns failure.
- [Sibling workspace moved] → Validate paths before stopping existing services and show the expected override variables.
- [Port collision] → Reuse `ensure_ports_available` with `--force` semantics and avoid killing unmanaged processes unless the user explicitly forces it.
- [Python MCP environment missing] → Fail the Doris target with the existing `start-doris-mcp.sh` installation hint and preserve logs.
