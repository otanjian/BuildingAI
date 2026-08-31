# opencode-iframe-header-parity Specification

## Purpose
Provide one consistent Bowi AI navigation header around embedded OpenCode conversations while preserving OpenCode Web as the complete renderer for OpenCode-specific chat behavior.
## Requirements
### Requirement: Embedded OpenCode uses the Bowi AI header

When an OpenCode Web session is rendered inside the Bowi AI OpenCode agent panel, the embedded page MUST hide its native titlebar/session-tab strip and Bowi AI MUST show the same sidebar toggle, back navigation, and agent identity controls used by the adjacent Bowi AI chat header.

#### Scenario: OpenCode conversation is embedded

- **WHEN** a user opens an OpenCode agent conversation in Bowi AI
- **THEN** the right panel has no duplicate OpenCode titlebar/session tabs, responsive “会话 / 更改” tabs, or sticky session-title row
- **AND** its top controls and conversation title match the Bowi AI-owned header

#### Scenario: Embedded conversation title is synchronized

- **WHEN** the OpenCode embed bootstrap returns a generated or persisted conversation title
- **THEN** Bowi AI renders that title beside the agent avatar in the parent header
- **AND** the title remains visible when the agent history panel is expanded

#### Scenario: Non-OpenCode conversation is opened

- **WHEN** a user opens a direct, Dify, Coze, or other non-OpenCode agent
- **THEN** its existing Bowi AI header and chat surface are unchanged

### Requirement: Header actions keep Bowi AI ownership

The embedded header controls MUST operate on Bowi AI state: the sidebar toggle MUST change the Bowi AI agent panel state and the back control MUST navigate to the Bowi AI agent listing. The iframe MUST NOT create, close, or switch OpenCode session tabs from this header.

#### Scenario: User toggles the sidebar from the embedded panel

- **WHEN** the user activates the embedded header sidebar control
- **THEN** the Bowi AI agent information/history panel expands or collapses consistently with the middle header

#### Scenario: User returns from the embedded conversation

- **WHEN** the user activates the embedded header back control
- **THEN** Bowi AI navigates to the agent listing without opening an OpenCode home/session-tab route

### Requirement: Embed mode is explicit and isolated

The OpenCode iframe URL MUST carry an explicit embed-mode marker, and OpenCode Web MUST apply the titlebar suppression only when that marker is present. Direct OpenCode Web routes MUST retain their native titlebar and session-tab behavior.

#### Scenario: Bowi AI creates an iframe URL

- **WHEN** Bowi AI builds the URL for a mapped OpenCode session
- **THEN** the URL contains the embed-mode marker and no credential-bearing query parameters

#### Scenario: OpenCode is opened directly

- **WHEN** a user opens the same OpenCode session through the normal OpenCode Web route
- **THEN** the native titlebar, session tabs, and editable session-title row remain visible and functional
