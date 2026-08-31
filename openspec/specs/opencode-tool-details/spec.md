# opencode-tool-details Specification

## Purpose
Keep routine OpenCode tool activity readable in the embedded BuildingAI conversation while allowing
users to inspect every command result or file change on demand.
## Requirements
### Requirement: Tool details are collapsed by default in the BuildingAI embed

The embedded BuildingAI OpenCode timeline MUST show shell output, file-edit/write/patch details, and
any other expandable tool body closed by default, regardless of whether the tool is completed or
still streaming. The tool header MUST remain visible with its existing status and concise summary.

#### Scenario: Completed shell tool

- **WHEN** a completed shell tool is rendered in a `buildingaiEmbed=1` conversation
- **THEN** its command output body is hidden initially
- **AND** the shell header remains visible and indicates that it can be expanded

#### Scenario: Completed file write tool

- **WHEN** a completed write tool has file contents to display in a `buildingaiEmbed=1` conversation
- **THEN** the file contents are hidden initially
- **AND** the write header remains visible with the file summary

#### Scenario: Streaming shell or file tool

- **WHEN** a shell, edit, write, or patch tool is pending or running in a `buildingaiEmbed=1` conversation
- **THEN** its detail body is closed initially
- **AND** its status/header remains visible while the tool runs

#### Scenario: Completed expandable tool of another type

- **WHEN** a completed tool with an expandable body is rendered in a `buildingaiEmbed=1` conversation
- **THEN** its body is hidden initially
- **AND** its existing header and summary remain visible

### Requirement: Users can expand tool details on demand

Each collapsed shell or file-edit/write/patch tool MUST expose its existing disclosure trigger. Pointer
activation or keyboard activation of that trigger MUST reveal the complete existing tool body without
changing tool execution or output data.

#### Scenario: Expand a shell body

- **WHEN** the user clicks or keyboard-activates a collapsed shell header
- **THEN** the shell output body becomes visible
- **AND** the trigger reports the expanded state through the existing disclosure semantics

#### Scenario: Expand a file body

- **WHEN** the user activates a collapsed edit, write, or patch header
- **THEN** the existing file/diff body becomes visible
- **AND** the user can use its existing scrolling, copy, preview, and diff controls

### Requirement: Direct OpenCode settings remain isolated

The default-collapse override MUST apply only when the URL contains the exact `buildingaiEmbed=1`
marker. Direct OpenCode routes MUST continue honoring their configured shell/edit expansion settings.

#### Scenario: Direct route with expanded preference

- **WHEN** a direct OpenCode route has shell or edit tool expansion enabled in settings
- **THEN** those tool details remain expanded by default
- **AND** no BuildingAI embed marker is required or inferred

