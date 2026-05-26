# ehcs-ai-settings Specification

## Purpose

Persist EHCS application binding to a single platform agent; provision and sync agent profile (role prompt, opening, MCP) via platform APIs.

## Requirements

### Requirement: Persist agent binding

The API SHALL store and return `agentId` in `ehcs_ai.ehcs-app_settings` (singleton row).

#### Scenario: Save settings

- **WHEN** admin updates settings via PUT with `agentId`
- **THEN** subsequent GET returns the saved agent id

### Requirement: Settings page provisions platform agent

The web settings route SHALL allow selecting an existing agent or creating/updating「EHCS数据健康自治」via platform `POST/PATCH /api/ai-agents`, including role prompt, opening statement, opening questions, quick commands, MCP server ids, and `maxSteps`.

#### Scenario: Provision agent

- **WHEN** user saves or auto-provision runs on settings load
- **THEN** agent appears under 我的智能体 and `app_settings.agent_id` is set

### Requirement: No separate model or MCP in app_settings

Extension settings SHALL NOT require `modelId` or `mcpServerIds` columns on `ehcs-app_settings`; model and MCP are configured on the platform agent entity.

#### Scenario: Check execution

- **WHEN** a check runs
- **THEN** only `/api/ai-agents/{agentId}/chat/stream` is invoked; MCP execution uses the agent's `mcpServerIds`

### Requirement: Extension does not call MCP directly

The extension SHALL NOT implement MCP protocol clients; ERP access is via the platform agent tool loop only.

#### Scenario: Check execution

- **WHEN** a rule check runs with MCP configured on the agent
- **THEN** the browser only calls platform agent chat API, not extension MCP endpoints
