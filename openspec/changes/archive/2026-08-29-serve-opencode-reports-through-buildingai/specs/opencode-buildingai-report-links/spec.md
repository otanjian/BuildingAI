## Purpose

Provide a secure, clickable path from HTML reports produced in embedded OpenCode conversations to a BuildingAI-hosted viewer on the current web origin.

## ADDED Requirements

### Requirement: Concrete HTML report references are clickable

The system SHALL make every concrete `.html` or `.htm` report filename shown by embedded OpenCode activatable as a report link, and report-producing instructions MUST require the final response to reference the concrete output by filename only, without exposing its containing directory or absolute workspace path.

#### Scenario: Assistant cites a generated report file

- **WHEN** a report-producing turn creates an HTML report
- **THEN** the final response MUST cite only the concrete HTML filename
- **AND** the final response MUST NOT expose the containing directory or absolute workspace path
- **AND** activating that filename MUST open the corresponding BuildingAI report-view URL

#### Scenario: Assistant cites only a directory

- **WHEN** a response contains only an artifact directory without a concrete HTML filename
- **THEN** the directory MUST NOT be treated as a report link

#### Scenario: Report filename is shown without its storage location

- **GIVEN** a report is stored at `/workspace/artifacts/conversation-1/采购情况分析_20260824_1600.html`
- **WHEN** the assistant presents the completed report
- **THEN** the visible reference MUST be `采购情况分析_20260824_1600.html`
- **AND** the visible response MUST NOT contain `/workspace/artifacts/conversation-1/`

### Requirement: Report opens on the BuildingAI web origin

The system SHALL open embedded OpenCode report links on the BuildingAI web origin associated with the current Agent conversation; in the default local deployment this origin SHALL use port `4091`.

#### Scenario: Default local report navigation

- **GIVEN** BuildingAI is accessed at `http://127.0.0.1:4091`
- **WHEN** the user activates a report reference from embedded OpenCode
- **THEN** the new report page URL MUST begin with `http://127.0.0.1:4091/`
- **AND** MUST identify the current Agent, conversation, and report-relative path

#### Scenario: BuildingAI is deployed on another origin

- **GIVEN** BuildingAI is accessed through a configured non-local web origin
- **WHEN** the embedded OpenCode URL is prepared
- **THEN** report links MUST use that BuildingAI origin rather than hard-coding a local host

### Requirement: Report viewer preserves conversation authorization

The system SHALL fetch report content with the current BuildingAI session credentials and SHALL enforce the existing Agent ownership, conversation ownership, and artifact-root path-containment rules.

#### Scenario: Authorized report view

- **GIVEN** the signed-in user owns the Agent conversation
- **WHEN** the user opens an existing HTML report in that conversation
- **THEN** the viewer MUST load the report through the authenticated conversation-artifact interface
- **AND** MUST render it in an isolated frame

#### Scenario: Unauthorized, missing, or escaping report

- **WHEN** the requested report belongs to another conversation, does not exist, or resolves outside the conversation artifact root
- **THEN** the viewer MUST NOT expose report content
- **AND** MUST display an explicit failure state

### Requirement: Existing file interactions remain compatible

The system SHALL limit BuildingAI report navigation to embedded mode and eligible HTML paths, without changing ordinary OpenCode source, diff, or non-HTML file interactions.

#### Scenario: Non-HTML path or non-embedded OpenCode

- **WHEN** a path is not an HTML report or OpenCode is not running in BuildingAI embedded mode
- **THEN** existing OpenCode behavior MUST remain unchanged
