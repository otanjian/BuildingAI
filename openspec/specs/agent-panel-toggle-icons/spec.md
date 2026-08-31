# agent-panel-toggle-icons Specification

## Purpose
Make the two desktop agent-header panel controls visually communicate which side panel they toggle
while preserving their established interactions.
## Requirements
### Requirement: Agent panel toggles use side-oriented panel icons

The desktop agent conversation header SHALL represent the left information/history panel toggle with
a left-side panel icon and the right workspace panel toggle with a right-side panel icon. Both icons
SHALL follow the existing header icon size and styling.

#### Scenario: OpenCode conversation header is displayed

- **WHEN** a user opens an OpenCode agent conversation on a desktop-width viewport
- **THEN** the left toggle shows a left-side panel icon and the right toggle shows a right-side
  panel icon

### Requirement: Icon replacement preserves panel behavior

Replacing the two icons MUST NOT change the controls' handlers, accessible labels, responsive
visibility, pressed state, or panel expand/collapse behavior.

#### Scenario: User activates the left panel toggle

- **WHEN** the user activates the left-side panel control
- **THEN** the information/history panel changes between its existing expanded and collapsed states

#### Scenario: User activates the right panel toggle

- **WHEN** the user activates the right-side panel control
- **THEN** the workspace panel changes between its existing open and closed states

