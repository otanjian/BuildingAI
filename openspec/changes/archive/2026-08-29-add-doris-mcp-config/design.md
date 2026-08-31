## Context

The root `mcp.json` is a local/Cursor-compatible MCP template. Doris MCP 1.0.0 supports Streamable HTTP and exposes `/mcp` on port 3000 by default.

## Goals / Non-Goals

**Goals:**

- Use the existing Doris HTTP endpoint without changing BuildingAI code.
- Keep the JSON valid and preserve existing entries.

**Non-Goals:**

- Changing MCP transport handling or Doris runtime behavior.

## Decisions

1. Use `streamable-http` with `http://127.0.0.1:3000/mcp`, matching Doris's existing default HTTP mode.
2. Do not modify BuildingAI runtime code; the endpoint uses an already supported transport.

## Risks / Trade-offs

- [Doris is not running] → Start `db/start-doris-mcp.sh` in the Doris workspace.

## Migration Plan

No migration is required. Existing MCP entries remain unchanged.
