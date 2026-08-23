## Purpose

Provides a focused and visually coherent OpenCode agent workspace while preserving the established
iframe renderer, session transport, authentication, and lifecycle.

## ADDED Requirements

### Requirement: Existing iframe integration remains authoritative

The system MUST continue to render OpenCode conversations through the existing iframe integration.
The iframe URL construction, conversation-to-session mapping, authentication, loading and error
handling, and mount lifecycle MUST NOT be replaced by a second conversation renderer or transport.

#### Scenario: OpenCode conversation is opened

- **WHEN** a user opens an OpenCode conversation
- **THEN** the existing iframe component loads the mapped OpenCode session through the existing
  embed URL and lifecycle

#### Scenario: Project files are opened and closed

- **WHEN** the user opens or closes the project-files surface
- **THEN** the active OpenCode iframe remains mounted with the same session and does not reload
  solely because of that action

### Requirement: Focused embedded conversation layout

The OpenCode agent page SHALL omit the redundant BuildingAI conversation placeholder and SHALL
allocate the resulting conversation workspace to the existing iframe.

#### Scenario: OpenCode agent page renders

- **WHEN** an OpenCode agent conversation is displayed
- **THEN** no duplicate placeholder conversation column is visible and the iframe fills the
  available main workspace

#### Scenario: Non-OpenCode agent renders

- **WHEN** a non-OpenCode agent conversation is displayed
- **THEN** its existing layout remains unchanged

### Requirement: Latest conversation entry behavior

When an OpenCode agent is entered without a conversation identifier, the system SHALL wait for the
existing non-debug, non-archived conversation history query to complete, open the most recently
updated conversation when one exists, and create one local draft only when no conversation exists. A
failed history query MUST NOT create a draft.

#### Scenario: Agent has conversation history

- **WHEN** the user enters an OpenCode agent without a conversation identifier and history contains
  conversations
- **THEN** the system replaces the route with the most recently updated conversation identifier

#### Scenario: Agent has no conversation history

- **WHEN** the user enters an OpenCode agent without a conversation identifier and history completes
  successfully with no conversations
- **THEN** the system creates exactly one local draft and replaces the route with that draft
  identifier

#### Scenario: History request fails

- **WHEN** conversation history cannot be loaded
- **THEN** the system presents a retryable error state and does not create a new draft

#### Scenario: Direct conversation link is opened

- **WHEN** the route already contains a conversation identifier
- **THEN** the system keeps that identifier and does not redirect to a different conversation

### Requirement: Overlay project-file access

The BuildingAI-owned iframe header SHALL expose a project-files action for OpenCode agents.
Activating it SHALL open an overlay workspace browser that reuses the existing lazy file tree,
read-only preview, and relative-path copy behavior without resizing or remounting the iframe.

#### Scenario: Project files are opened

- **WHEN** the user activates the project-files action
- **THEN** an overlay file browser opens above the conversation and the iframe remains mounted
  underneath

#### Scenario: File is selected

- **WHEN** the user selects a supported file in the tree
- **THEN** the existing workspace content service supplies a read-only preview

#### Scenario: Relative path is copied

- **WHEN** the user activates a row or preview copy action
- **THEN** the workspace-relative path is copied and visible confirmation is shown

### Requirement: Hidden workspace paths are inaccessible

The workspace browser and file-content capability MUST omit or reject any path containing a
dot-prefixed segment, as well as configured noise paths. Path traversal outside the configured
workspace MUST continue to be rejected.

#### Scenario: Directory contains hidden entries

- **WHEN** a listed directory contains a file or folder whose name begins with a dot
- **THEN** the entry is omitted from the client response

#### Scenario: Hidden path is requested directly

- **WHEN** a user manually requests content for a path containing a dot-prefixed segment
- **THEN** the system rejects the request without returning file content

### Requirement: Single-file download

The project-file browser SHALL allow users to download listed files by using the existing
authenticated file-content capability. Text content SHALL preserve its original whitespace, and
Base64 binary content SHALL be decoded with its supplied media type. The browser SHALL use the
selected file's basename as the download name.

#### Scenario: Text file is downloaded

- **WHEN** the user activates download for a text file
- **THEN** the browser downloads the complete untrimmed file content using a UTF-8 Blob

#### Scenario: Binary file is downloaded

- **WHEN** the user activates download for a Base64 binary file
- **THEN** the browser decodes and downloads the original bytes using the supplied media type

### Requirement: Embed-only visual parity and structured output

Only when OpenCode is rendered with the explicit BuildingAI embed marker, its base background, text
hierarchy, border treatment, sans-serif and monospace fonts SHALL align with BuildingAI's embedded
surface. Structured reasoning, tool calls, and final text MUST remain distinct native OpenCode
parts; reasoning SHALL be visibly labeled and collapsible, tool calls SHALL retain native status
cards, and final text SHALL retain normal Markdown presentation.

#### Scenario: Embedded OpenCode is displayed

- **WHEN** an OpenCode session loads with the BuildingAI embed marker
- **THEN** embed-only visual tokens and structured-part presentation are applied

#### Scenario: BuildingAI theme differs from the operating system

- **WHEN** BuildingAI is manually set to light or dark mode while the operating system uses the
  opposite color scheme
- **THEN** the existing iframe element communicates BuildingAI's resolved color scheme and the
  embedded surface uses the matching light or dark tokens without remounting

#### Scenario: Direct OpenCode is displayed

- **WHEN** the same OpenCode application is opened without the BuildingAI embed marker
- **THEN** its normal theme, settings, and output presentation remain unchanged

#### Scenario: Structured response contains reasoning, tools, and text

- **WHEN** a response includes native reasoning, tool, and text parts
- **THEN** each part is shown in its dedicated presentation without using text heuristics or
  replacing the native OpenCode renderer
