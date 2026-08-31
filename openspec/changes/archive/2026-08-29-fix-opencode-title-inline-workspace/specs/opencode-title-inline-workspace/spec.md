## Purpose

Keeps embedded OpenCode conversations identifiable and preserves simultaneous access to the
conversation and its project workspace.

## ADDED Requirements

### Requirement: Embedded OpenCode conversations receive a meaningful title

The system SHALL allow OpenCode to generate a title from the first real user message in a newly
embedded conversation and SHALL persist that title to the mapped BuildingAI conversation.

#### Scenario: First message generates and synchronizes a title

- **WHEN** a user sends the first real message in an embedded OpenCode conversation whose title is
  still a system placeholder
- **THEN** OpenCode generates a meaningful conversation title
- **AND** BuildingAI persists the generated title to the mapped conversation
- **AND** the agent history displays the generated title without a full-page refresh

#### Scenario: Existing title is preserved

- **WHEN** an OpenCode session reports a title for a BuildingAI conversation that already has a
  non-placeholder title
- **THEN** the system MUST preserve the existing BuildingAI title

#### Scenario: OpenCode is temporarily unavailable

- **WHEN** the OpenCode title cannot be read or generated
- **THEN** the BuildingAI conversation remains accessible with its current title
- **AND** conversation history loading MUST NOT depend on OpenCode availability

### Requirement: Workspace opens beside the embedded conversation

On desktop, the embedded OpenCode workbench SHALL open Workspace as a collapsible, resizable
right-side panel within the conversation layout and MUST keep the conversation visible beside it.

#### Scenario: Open Workspace

- **WHEN** a user clicks the Workspace button while the panel is closed
- **THEN** the workspace appears on the right side of the conversation
- **AND** it does not cover the conversation with an overlay

#### Scenario: Resize and close Workspace

- **WHEN** a user resizes or closes the Workspace panel
- **THEN** the conversation remains mounted and usable
- **AND** clicking the Workspace button again reopens the right-side panel

#### Scenario: Conversation context is retained

- **WHEN** the Workspace panel is opened or closed
- **THEN** the selected conversation and embedded OpenCode session remain unchanged
