## Purpose

Provide a reliable Doris MCP connection for enterprise analysis agents, while preserving compatibility with existing MCP servers and keeping connection diagnostics safe to persist.

## ADDED Requirements

### Requirement: Modern Doris endpoints remain usable

The system MUST recognize a Doris Streamable HTTP endpoint that advertises the supported modern MCP protocol and MUST use the modern request envelope for tool discovery and tool calls. A successful connection check MUST mark the server connectable and retain the discovered tools.

#### Scenario: Doris modern discovery succeeds

- **WHEN** the configured Doris endpoint returns `2026-07-28` from protocol discovery
- **THEN** the connection check uses modern `tools/list`, reports success, and stores the returned tool definitions

#### Scenario: Doris tool call uses the negotiated protocol

- **WHEN** an agent invokes a tool discovered from the modern Doris endpoint
- **THEN** the request includes the negotiated protocol metadata and returns the tool result without falling back to the legacy client

### Requirement: Legacy MCP compatibility is preserved

The system MUST continue to connect to legacy Streamable HTTP and SSE endpoints when modern protocol discovery is unsupported or unavailable, without changing their configured transport semantics.

#### Scenario: Legacy endpoint falls back

- **WHEN** a configured endpoint does not advertise the modern protocol but accepts the existing MCP handshake
- **THEN** the system uses the legacy transport and completes the connection check as before

### Requirement: Connection diagnostics are persistable

The system MUST normalize connection errors before persisting them in the MCP server status record, keeping the stored value within the database column limit while preserving the actionable cause in logs and the API response.

#### Scenario: Oversized transport error is persisted safely

- **WHEN** a connection attempt returns an error longer than the status field allows
- **THEN** the status update succeeds, stores a bounded message, and does not replace the original connection result with a database-length failure

