# ehcs-ai-platform-chat Specification

## Purpose

EHCS agent interaction via the platform **WebAPP publish** page embedded in a right dock iframe. Full checks are driven by the bound agent (**bowi-mcp** with `appId: ehcs-ai` + ERP MCP), not by extension-side rule loops.

## Requirements

### Requirement: Embed publish chat in agent dock

The extension layout SHALL embed the platform publish URL in an iframe when the user opens the agent dock via the **top bar 🤖** toggle.

The iframe `src` SHALL be `{origin}/agents/{agentId}/{accessToken}` where `accessToken` comes from the agent `publishConfig` with `enableSite: true`.

#### Scenario: Publish configured

- **WHEN** settings contain `agentId`, WebAPP publish is enabled, and `accessToken` exists
- **THEN** opening the dock shows the same chat UI as the standalone publish page

#### Scenario: Publish not configured

- **WHEN** `enableSite` or `accessToken` is missing
- **THEN** the top bar 🤖 toggle shows a toast directing the user to Settings to update/save the EHCS agent

### Requirement: Agent id from app settings

The embed URL SHALL use `agentId` from `ehcs_ai.ehcs-app_settings`, resolved via GET/PUT `/ehcs-ai/console/settings`.

Provisioning SHALL enable WebAPP publish (`enableSite` + `accessToken`) on the EHCS platform agent.

#### Scenario: Agent configured

- **WHEN** user saves settings or runs「更新 EHCS 智能体」
- **THEN** publish config is updated and the dock iframe can load

### Requirement: Full check via agent tools (not client rule loop)

When the user sends「开始检查」inside the embedded publish chat, the extension web client SHALL NOT call `GET /rules` or loop rules. The platform agent SHALL use **bowi-mcp** tools (`bowi_start_full_check`, `bowi_get_check_progress`, `bowi_cancel_check`, `bowi_ingest_rule_result`, `bowi_sql_query`, `bowi_sql_execute`) with `appId: "ehcs-ai"` plus ERP MCP for business data.

### Requirement: bowi-mcp tools visible in platform UI

When「更新 EHCS 智能体」runs, the extension SHALL upsert all catalog tools into `ai_mcp_tool` for the shared `bowi-mcp` server so the agent configuration UI shows the correct tool count (not 0 while connectable).

#### Scenario: After provision

- **WHEN** user runs provision/update EHCS agent
- **THEN** bowi-mcp shows six tools in「查看工具」

#### Scenario: Enabled rules exist

- **WHEN** user sends「开始检查」in the iframe
- **THEN** the agent runs the bowi-mcp full-check flow and ingests per rule

### Requirement: Opening UI matches platform agent

The embedded publish page SHALL display `openingStatement` and `openingQuestions` from the platform agent configuration (no duplicate custom ChatPanel in the dock).

#### Scenario: First open

- **WHEN** user opens the dock with no prior conversation in the iframe session
- **THEN** publish page shows configured opening copy and suggestion chips
