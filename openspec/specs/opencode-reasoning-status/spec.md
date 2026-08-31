# opencode-reasoning-status Specification

## Purpose
Ensure embedded OpenCode reasoning summaries communicate whether model reasoning is still active or
already complete without changing the preserved reasoning content.
## Requirements
### Requirement: Reasoning summaries reflect assistant completion

The Bowi AI OpenCode embed MUST label a reasoning summary according to the lifecycle of its
assistant message.

#### Scenario: Reasoning is still streaming

- **WHEN** a reasoning summary belongs to an assistant message without a completion timestamp
- **THEN** the summary displays the localized in-progress reasoning label
- **AND** the reasoning body remains expanded under the existing embed behavior

#### Scenario: Reasoning has completed

- **WHEN** a reasoning summary belongs to an assistant message with a completion timestamp
- **THEN** the summary displays the localized completed reasoning label
- **AND** the reasoning body is collapsed under the existing embed behavior

### Requirement: The status change is isolated to the Bowi AI embed disclosure

The lifecycle-specific disclosure label MUST apply only to the reasoning disclosure introduced for
`buildingaiEmbed=1`; direct OpenCode reasoning rendering MUST retain its existing presentation.

#### Scenario: Direct OpenCode route

- **WHEN** the same completed reasoning content is rendered outside `buildingaiEmbed=1`
- **THEN** OpenCode uses its existing direct-route reasoning presentation
- **AND** no embedded disclosure label is introduced
