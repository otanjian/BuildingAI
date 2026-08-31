## ADDED Requirements

### Requirement: Managed OpenCode agents are bound to canonical Bowi MCP

The system SHALL ensure every enabled agent whose `createMode` is `opencode` has the enabled
canonical `bowi-mcp` server ID in `mcpServerIds` after Bowi catalog synchronization completes.

#### Scenario: Repair an empty binding

- **GIVEN** an enabled canonical `bowi-mcp` server exists
- **AND** an OpenCode agent has no MCP server IDs
- **WHEN** the API completes Bowi catalog synchronization
- **THEN** the agent is saved with the canonical Bowi server ID in `mcpServerIds`

#### Scenario: Preserve unrelated bindings

- **GIVEN** an enabled canonical `bowi-mcp` server exists
- **AND** an OpenCode agent already has unrelated MCP server IDs
- **WHEN** the API completes Bowi catalog synchronization
- **THEN** all existing IDs remain and the canonical Bowi ID is added exactly once

#### Scenario: Idempotent synchronization

- **GIVEN** an OpenCode agent already contains the canonical Bowi server ID
- **WHEN** Bowi catalog synchronization runs again
- **THEN** the agent is not rewritten solely for this binding

#### Scenario: Non-OpenCode agents are unchanged

- **GIVEN** an enabled canonical `bowi-mcp` server exists
- **AND** an agent has any other `createMode`
- **WHEN** the API completes Bowi catalog synchronization
- **THEN** that agent's MCP binding is unchanged

#### Scenario: Missing canonical server fails soft

- **GIVEN** no enabled canonical `bowi-mcp` server exists
- **WHEN** Bowi catalog synchronization runs
- **THEN** no agent binding is changed and API bootstrap continues
