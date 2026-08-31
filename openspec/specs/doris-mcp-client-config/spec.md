# doris-mcp-client-config Specification

## Purpose
Provide a standard local MCP configuration that lets compatible clients communicate with the Doris MCP server over Streamable HTTP.
## Requirements
### Requirement: Doris HTTP entry is present

The local MCP configuration template MUST contain a `mcpServers.doris` entry whose type is `streamable-http` and whose URL is `http://127.0.0.1:3000/mcp`.

#### Scenario: Client reads the Doris entry

- **WHEN** a compatible MCP client loads the root `mcp.json` template
- **THEN** it can resolve the Doris server at the configured Streamable HTTP endpoint

#### Scenario: Doris endpoint is available

- **WHEN** Doris MCP is started with its default HTTP configuration
- **THEN** requests to `http://127.0.0.1:3000/mcp` reach the Doris MCP server

### Requirement: Existing MCP entries remain compatible

Adding the Doris entry MUST preserve all existing `mcpServers` entries and MUST leave the configuration valid JSON.

#### Scenario: Existing servers are loaded after the update

- **WHEN** a client parses the updated template
- **THEN** the pre-existing `ERPnext-local` and `bowi` entries remain available with their original values

