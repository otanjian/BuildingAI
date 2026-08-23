## Purpose

Provide one consistent BuildingAI navigation header around embedded OpenCode conversations while preserving OpenCode Web as the complete renderer for OpenCode-specific chat behavior.

## ADDED Requirements

### Requirement: Embedded OpenCode uses the BuildingAI header

When an OpenCode Web session is rendered inside the BuildingAI OpenCode agent panel, the embedded page MUST hide its native titlebar/session-tab strip and BuildingAI MUST show the same sidebar toggle, back navigation, and agent identity controls used by the adjacent BuildingAI chat header.

#### Scenario: OpenCode conversation is embedded

- **WHEN** a user opens an OpenCode agent conversation in BuildingAI
- **THEN** the right panel has no duplicate OpenCode titlebar/session tabs and its top controls match the middle BuildingAI header

#### Scenario: Non-OpenCode conversation is opened

- **WHEN** a user opens a direct, Dify, Coze, or other non-OpenCode agent
- **THEN** its existing BuildingAI header and chat surface are unchanged

### Requirement: Header actions keep BuildingAI ownership

The embedded header controls MUST operate on BuildingAI state: the sidebar toggle MUST change the BuildingAI agent panel state and the back control MUST navigate to the BuildingAI agent listing. The iframe MUST NOT create, close, or switch OpenCode session tabs from this header.

#### Scenario: User toggles the sidebar from the embedded panel

- **WHEN** the user activates the embedded header sidebar control
- **THEN** the BuildingAI agent information/history panel expands or collapses consistently with the middle header

#### Scenario: User returns from the embedded conversation

- **WHEN** the user activates the embedded header back control
- **THEN** BuildingAI navigates to the agent listing without opening an OpenCode home/session-tab route

### Requirement: Embed mode is explicit and isolated

The OpenCode iframe URL MUST carry an explicit embed-mode marker, and OpenCode Web MUST apply the titlebar suppression only when that marker is present. Direct OpenCode Web routes MUST retain their native titlebar and session-tab behavior.

#### Scenario: BuildingAI creates an iframe URL

- **WHEN** BuildingAI builds the URL for a mapped OpenCode session
- **THEN** the URL contains the embed-mode marker and no credential-bearing query parameters

#### Scenario: OpenCode is opened directly

- **WHEN** a user opens the same OpenCode session through the normal OpenCode Web route
- **THEN** the native titlebar and session tabs remain visible and functional
