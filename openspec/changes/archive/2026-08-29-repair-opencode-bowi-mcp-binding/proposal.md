## Why

The SAP OpenCode agent can start a conversation with an empty `mcpServerIds` binding, so its model
receives no Bowi business tools and falls back to shell-based HTTP calls. Those calls do not carry
the verified OpenCode session metadata and are rejected as `BOWI_FORBIDDEN`. The failure is
reproducible for existing OpenCode agents created before the canonical Bowi MCP server was
synchronized, so the binding must be repaired automatically now.

## What Changes

- Ensure every managed OpenCode agent receives the enabled canonical `bowi-mcp` server binding when
  its stored binding is missing or stale.
- Preserve explicitly configured non-Bowi MCP servers while adding Bowi exactly once.
- Repair existing OpenCode agent rows during the normal API bootstrap/catalog synchronization path,
  without exposing credentials or weakening Bowi subject authorization.
- Add regression coverage proving an empty binding is repaired and existing bindings are not
  duplicated.

**Non-goals:** changing Bowi capability policy, accepting user IDs or credentials in tool arguments,
or bypassing Bowi with direct SAP MCP calls.

## Capabilities

### New Capabilities

- `opencode-bowi-mcp-binding`: Managed OpenCode agents are automatically bound to the canonical Bowi
  business MCP server.

### Modified Capabilities

- None.

## Impact

- Main API Bowi catalog synchronization service and agent persistence.
- Existing OpenCode agent records may be updated once at bootstrap; no schema migration is required.
- Focused API unit tests and OpenSpec validation.
