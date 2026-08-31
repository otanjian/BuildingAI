## ADDED Requirements

### Requirement: Agent name hidden by default in history rows

When a unified-history conversation row is for an agent and includes an agent name, the system SHALL display the conversation title as the primary visible text by default and SHALL NOT show the agent name as always-visible chrome in the default (non-hovered) state.

#### Scenario: Sidebar history row at rest

- **WHEN** the user views an expanded sidebar history sub-item for an agent conversation with an agent name
- **THEN** the visible label is the conversation title without a persistently visible agent-name prefix

#### Scenario: Command dialog history row at rest

- **WHEN** the user views a history command-dialog item for an agent conversation with an agent name
- **THEN** the visible label is the conversation title without a persistently visible agent-name prefix

### Requirement: Agent name revealed on hover

When the user hovers a history row that has an agent name, the system SHALL reveal the agent name inline before the conversation title (faded/visible on hover).

#### Scenario: Hover sidebar history row

- **WHEN** the pointer hovers a sidebar agent history sub-item that has an agent name
- **THEN** the agent name becomes visible inline before the title

#### Scenario: Hover command dialog history row

- **WHEN** the pointer hovers a command-dialog agent history item that has an agent name
- **THEN** the agent name becomes visible inline before the title

### Requirement: Accessible agent name when visually hidden

When the agent name is not visually shown in the default state, the system SHALL still expose the agent name to assistive technologies (for example via visually-hidden text or an accessible name that includes the agent name).

#### Scenario: Screen reader announces agent context

- **WHEN** assistive technology reads an agent history row at rest
- **THEN** the announced name includes the agent name and the conversation title
