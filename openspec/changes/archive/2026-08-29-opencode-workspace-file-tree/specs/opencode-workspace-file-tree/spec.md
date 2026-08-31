## Purpose

Lets users of OpenCode agents browse the configured workspace and preview files read-only from the Agent chat UI, without leaving the conversation.

## ADDED Requirements

### Requirement: Workspace tree toggle for OpenCode agents
The Agent chat UI SHALL show a workspace file-tree toggle control in the chat header only when the published agent `createMode` is `opencode`. Non-OpenCode agents MUST NOT see the control. Activating the control SHALL open a right-side panel; activating again SHALL close it.

#### Scenario: OpenCode agent shows toggle
- **WHEN** the user opens Agent chat for an agent with `createMode` equal to `opencode`
- **THEN** the chat header exposes a control to open or close the workspace file tree panel

#### Scenario: Non-OpenCode agent hides toggle
- **WHEN** the user opens Agent chat for an agent whose `createMode` is not `opencode`
- **THEN** the workspace file tree toggle is not shown

#### Scenario: Toggle opens and closes panel
- **WHEN** the user activates the workspace file tree toggle
- **THEN** a right-side workspace panel opens if closed, or closes if open

### Requirement: Proxied workspace directory listing
The system SHALL provide an authenticated API that lists files and directories under the OpenCode agent's configured workspace by proxying OpenCode's file list capability. The browser MUST NOT call OpenCode directly. Requests with a path that escapes the workspace root MUST be rejected. Entries marked ignored by OpenCode, basenames that start with `.` (dotfiles/dotdirs), or matching known noise names such as `node_modules` and `dist` MUST be omitted from the response presented to the client.

#### Scenario: List workspace root
- **WHEN** an authenticated user requests the workspace listing for an OpenCode agent at the workspace root path
- **THEN** the system returns child file and directory entries for that path

#### Scenario: Reject path escape
- **WHEN** an authenticated user requests a listing path that resolves outside the agent's configured workspace
- **THEN** the system rejects the request without returning filesystem contents outside the workspace

#### Scenario: Hide ignored, noise, and dot entries
- **WHEN** the listing includes entries that OpenCode marks as ignored, that start with `.` (for example `.opencode` or `.env`), or that match noise directory names such as `node_modules` or `dist`
- **THEN** those entries are not returned to the client for display

### Requirement: Proxied read-only file content
The system SHALL provide an authenticated API that returns file content for a path under the OpenCode agent's workspace by proxying OpenCode's file content capability. Paths outside the workspace MUST be rejected. Binary or unsupported content MAY be refused with a clear error; MVP MUST support common text files for preview.

#### Scenario: Read text file
- **WHEN** an authenticated user requests content for a text file path inside the workspace
- **THEN** the system returns the file content for read-only preview

#### Scenario: Reject path outside workspace
- **WHEN** an authenticated user requests content for a path outside the workspace
- **THEN** the system rejects the request

### Requirement: Lazy tree and read-only preview in chat UI
The workspace panel SHALL load directory children when a folder is expanded (lazy load). Selecting a file SHALL show a read-only preview of that file's content in the panel. The panel MUST NOT allow editing or saving files in MVP.

#### Scenario: Expand folder loads children
- **WHEN** the user expands a folder in the workspace tree
- **THEN** the UI requests that folder's children and renders them under the folder

#### Scenario: Select file shows preview
- **WHEN** the user selects a file in the workspace tree
- **THEN** the panel shows a read-only preview of the file content

#### Scenario: No edit in MVP
- **WHEN** the user views a file preview in the workspace panel
- **THEN** the UI does not offer edit or save actions for that file
