## Purpose

Provide a single, native OpenCode Web conversation surface inside BuildingAI while keeping local
conversation management in BuildingAI.

## ADDED Requirements

### Requirement: OpenCode agents use the OpenCode Web iframe

When an agent has `createMode=opencode`, the chat page MUST render the OpenCode Web application in
an iframe and MUST NOT render the legacy OpenCode projection/composer alongside it. Agents with
another create mode MUST retain their existing chat surface.

#### Scenario: OpenCode agent is opened

- **WHEN** a user opens an OpenCode agent conversation
- **THEN** BuildingAI renders one OpenCode Web iframe as the chat surface and keeps its own
  sidebar/history navigation visible

#### Scenario: Non-OpenCode agent is opened

- **WHEN** a user opens a direct, Dify, Coze, or other non-OpenCode agent
- **THEN** the existing BuildingAI chat renderer is used with no iframe behavior

### Requirement: Local conversations own remote sessions

The embed contract MUST validate the local conversation and agent ownership, create an OpenCode
session only when the local conversation has no mapping, persist the mapping, and return a stable
URL for the mapped session.

#### Scenario: First embed of a local conversation

- **WHEN** the user opens an OpenCode conversation without an `opencodeSessionId`
- **THEN** BuildingAI creates exactly one remote session, stores its ID against the local
  conversation, and returns the iframe URL for that session

#### Scenario: Refresh or revisit

- **WHEN** the same local conversation is opened again
- **THEN** BuildingAI reuses the persisted remote session and does not create another remote session

#### Scenario: Unauthorized conversation

- **WHEN** an embed request references a conversation belonging to another user, agent, or anonymous
  visitor
- **THEN** the request is rejected and no OpenCode session is created

### Requirement: Iframe follows BuildingAI conversation navigation

The iframe MUST be remounted or navigated when the BuildingAI conversation ID changes, and MUST show
an explicit loading or retryable error state while the embed contract or OpenCode runtime is
unavailable.

#### Scenario: History selection

- **WHEN** the user selects another conversation in BuildingAI history
- **THEN** the iframe displays the other conversation's mapped OpenCode session rather than
  retaining the previous session

#### Scenario: OpenCode runtime unavailable

- **WHEN** the embed contract cannot reach or create an OpenCode session
- **THEN** BuildingAI keeps the local conversation intact and shows a retry action instead of a
  blank or duplicate composer

### Requirement: No credential leakage

The iframe URL MUST NOT contain BuildingAI bearer tokens, OpenCode API keys, or OpenCode basic-auth
passwords. The endpoint MUST expose only the URL and non-secret session metadata required by the
client.

#### Scenario: Embed URL is safe to expose to the browser

- **WHEN** BuildingAI returns an iframe URL for a configured OpenCode runtime
- **THEN** the URL contains only the normalized runtime origin, encoded server key, and session ID,
  with no bearer token, API key, or basic-auth password
