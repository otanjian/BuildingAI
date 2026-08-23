## Purpose

Keeps embedded OpenCode conversations focused by removing redundant secondary workspace chrome while preserving the full OpenCode interface on direct routes.

## ADDED Requirements

### Requirement: Embedded session omits the secondary workspace panel

The system SHALL omit the complete secondary workspace panel from an OpenCode session carrying the explicit BuildingAI embed marker, regardless of persisted review, file-browser, or terminal panel state, and SHALL allocate the released width to the conversation.

#### Scenario: Embedded session has a persisted open panel

- **GIVEN** review, file-browser, or terminal panel state is open
- **WHEN** the session is displayed with `buildingaiEmbed=1`
- **THEN** no secondary workspace panel or resize handle is rendered
- **AND** the conversation occupies the available session width

### Requirement: Embedded session omits the header action cluster

The system SHALL omit the session-header context/status control and overflow action menu from an OpenCode session carrying the explicit BuildingAI embed marker while retaining the session title.

#### Scenario: Embedded session header is displayed

- **WHEN** a session with a title is displayed with `buildingaiEmbed=1`
- **THEN** the title remains visible
- **AND** the context/status control and overflow menu are absent

### Requirement: Direct OpenCode routes retain the full shell

The system MUST preserve normal secondary panel and session-header action behavior when the explicit BuildingAI embed marker is absent or has any value other than `1`.

#### Scenario: Session is opened directly

- **GIVEN** normal OpenCode panel state and header actions are available
- **WHEN** the same session is displayed without `buildingaiEmbed=1`
- **THEN** its secondary panel state is honored
- **AND** its context/status and overflow controls remain available
