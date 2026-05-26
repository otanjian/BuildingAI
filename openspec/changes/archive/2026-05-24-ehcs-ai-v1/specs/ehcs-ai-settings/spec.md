## ADDED Requirements

### Requirement: Persist application settings

The API SHALL store and return `modelId` and `mcpServerIds` (array of platform MCP server ids) in `app_settings`.

#### Scenario: Save settings

- **WHEN** admin updates settings via PUT
- **THEN** subsequent GET returns the saved values

### Requirement: Settings page in extension

The web app SHALL provide a settings route where operators select default chat model and MCP servers.

#### Scenario: Configure model

- **WHEN** user selects a model and saves
- **THEN** batch check and RCA use that `modelId`

### Requirement: Extension does not call MCP directly

Settings SHALL only store ids for the platform; the extension SHALL NOT implement MCP protocol clients.

#### Scenario: Check execution

- **WHEN** a check runs with MCP ids configured
- **THEN** only `/api/ai-chat` is invoked from the browser with `mcpServerIds`; no extension API calls MCP endpoints
