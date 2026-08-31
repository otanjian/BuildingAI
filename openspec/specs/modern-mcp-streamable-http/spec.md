# modern-mcp-streamable-http Specification

## Purpose
Allow Bowi AI agents and administration tools to use modern MCP Streamable HTTP servers that place protocol metadata in each request envelope, while preserving existing legacy MCP integrations.
## Requirements
### Requirement: Modern MCP protocol discovery

The system SHALL discover and use a modern MCP Streamable HTTP protocol when the endpoint advertises or accepts the `2026-07-28` request-envelope format.

#### Scenario: Modern endpoint is reachable

- **WHEN** a configured Streamable HTTP endpoint accepts a modern protocol discovery request
- **THEN** the system SHALL mark the server connectable and expose its available tools

#### Scenario: Modern endpoint requires per-request metadata

- **WHEN** the endpoint requires protocol version and client capabilities in the request metadata envelope
- **THEN** the system SHALL include that metadata on discovery and tool requests

### Requirement: Modern tool operations

The system SHALL list and invoke tools from a modern MCP Streamable HTTP endpoint using valid request-envelope metadata and SHALL return the endpoint's result or a clear error.

#### Scenario: List tools from a modern endpoint

- **WHEN** a connected modern server is selected for an agent
- **THEN** the system SHALL return the server's tool names, descriptions, and input schemas

#### Scenario: Invoke a modern tool

- **WHEN** an agent calls a tool from a connected modern server
- **THEN** the system SHALL send a modern MCP request and return the structured or textual result

### Requirement: Legacy compatibility

The system SHALL continue to support existing legacy MCP handshake endpoints without requiring configuration changes.

#### Scenario: Existing legacy server

- **WHEN** a configured endpoint only supports a legacy initialize handshake
- **THEN** the system SHALL connect, list tools, and invoke tools using the legacy transport behavior

#### Scenario: Unsupported protocol

- **WHEN** an endpoint supports neither a known legacy protocol nor the modern protocol
- **THEN** the system SHALL mark the server not connectable and report an actionable protocol compatibility error
