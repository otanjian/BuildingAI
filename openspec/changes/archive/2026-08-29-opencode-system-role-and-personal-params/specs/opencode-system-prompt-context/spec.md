## Purpose

Supplies OpenCode turns with merged system context from the agent role prompt and the signed-in user's personal parameter table so persona and account-level values take effect during OpenCode execution.

## ADDED Requirements

### Requirement: OpenCode system includes agent role prompt
When BuildingAI starts an OpenCode chat turn for an agent that has a non-empty role prompt, the system SHALL include that role prompt text in the OpenCode prompt `system` payload together with the existing artifact-isolation instructions.

#### Scenario: Role prompt present
- **WHEN** an authenticated or anonymous user sends a message to an OpenCode agent whose `rolePrompt` is non-empty after trim
- **THEN** the OpenCode prompt `system` value MUST contain the trimmed role prompt text and MUST still contain the artifact isolation instructions for the conversation

#### Scenario: Role prompt empty
- **WHEN** an OpenCode agent has an empty or whitespace-only `rolePrompt`
- **THEN** the OpenCode prompt `system` value MUST omit a role-prompt section and MUST still include the artifact isolation instructions (backward compatible with prior behavior)

### Requirement: OpenCode system includes account personal parameters
When BuildingAI starts an OpenCode chat turn for a signed-in user who has personal parameters stored under the account `personalParams` group, the system SHALL append a system section that lists each parameter's code and value (whole-table injection; not template substitution into the role prompt).

#### Scenario: Personal parameters present
- **WHEN** a signed-in user with one or more `personalParams` entries sends a message to an OpenCode agent
- **THEN** the OpenCode prompt `system` value MUST include each parameter code and its corresponding value

#### Scenario: No personal parameters or anonymous user
- **WHEN** the user has no `personalParams` entries, or the turn has no signed-in user id
- **THEN** the OpenCode prompt `system` value MUST omit the personal-parameters section and MUST NOT fail the turn for that reason

### Requirement: System section order is deterministic
The OpenCode prompt `system` payload SHALL concatenate non-empty sections in this order: role prompt, personal parameters, artifact isolation hint.

#### Scenario: All sections present
- **WHEN** role prompt is non-empty and the signed-in user has personal parameters
- **THEN** the merged `system` string MUST place the role prompt before the personal-parameters section, and the personal-parameters section before the artifact isolation hint
