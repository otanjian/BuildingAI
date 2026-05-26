## ADDED Requirements

### Requirement: Per-application platform agent configuration

Each enterprise extension SHALL ship `seed-data/{mcp_prefix}-platform-agent.config.ts` defining agent display name, description, role prompt, opening message, and suggested questions aligned with that application's PRD (trigger phrase, MCP tool names, schema/table prefix, auto-fix policy).

#### Scenario: Settings page creates agent

- **WHEN** an admin opens Settings and chooses create or update agent
- **THEN** the platform creates or updates an agent named per registry `agentName`
- **AND** persists `agent_id` in `{prefix}-app_settings`
- **AND** enables WebAPP publish with `accessToken` for the embedded agent dock

### Requirement: Agent seeder on install

Each extension SHALL include a `PlatformAgentSeeder` that runs on extension data seed when `agent_id` is missing, binding the platform agent if an active LLM model and enabled MCP server exist (preferring ERP-related MCP names).

#### Scenario: First-time install

- **WHEN** the extension is enabled and database seed runs without existing `agent_id`
- **THEN** the seeder attempts to create or link the application agent
- **AND** the agent appears under the current user's agents list or via settings reassignment

### Requirement: MCP tools registered with agent update

Updating the application agent from Settings SHALL register the extension's built-in MCP server tools (`{mcp_prefix}_start_full_check`, `{mcp_prefix}_get_check_progress`, `{mcp_prefix}_cancel_check`, `{mcp_prefix}_ingest_rule_result`, `{mcp_prefix}_sql_query`, `{mcp_prefix}_sql_execute`) to the platform tool library and bind them to the agent.

#### Scenario: Tool count visible in console

- **WHEN** an admin updates the agent from the application settings page
- **THEN** the agent's MCP tool list includes six application-specific tools with non-zero count
