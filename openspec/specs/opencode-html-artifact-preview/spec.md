# opencode-html-artifact-preview Specification

## Purpose
Let users safely open HTML reports referenced by an embedded OpenCode conversation without copying workspace paths, exposing credentials, or executing generated content in the conversation origin.
## Requirements
### Requirement: Embedded assistant HTML paths are actionable

The system SHALL present workspace paths ending in `.html` or `.htm` in an assistant reply as an actionable browser-preview control when the conversation uses the explicit Bowi AI embed mode. Other inline paths and direct OpenCode routes MUST retain their existing behavior.

#### Scenario: Open an HTML path from an embedded reply

- **WHEN** an assistant reply in `buildingaiEmbed=1` contains an inline workspace path ending in `.html` or `.htm`
- **AND** the user activates that path
- **THEN** the system opens a report preview in a new browser tab

#### Scenario: Non-HTML path remains unchanged

- **WHEN** an assistant reply contains an inline path that does not end in `.html` or `.htm`
- **THEN** the system MUST NOT present that path as an HTML browser-preview control

#### Scenario: Direct OpenCode route remains unchanged

- **WHEN** the same HTML path is rendered outside `buildingaiEmbed=1`
- **THEN** the system MUST retain the standard OpenCode inline-path behavior

### Requirement: Changed HTML files expose a preview action

The system SHALL expose a distinct browser-preview action for `.html` and `.htm` entries in an embedded turn's changed-file summary while preserving the existing file-diff expansion control.

#### Scenario: Preview a changed HTML file

- **WHEN** an embedded turn summary contains a changed `.html` or `.htm` file
- **AND** the user activates its browser-preview action
- **THEN** the system opens the same safe report preview used by assistant HTML paths
- **AND** MUST NOT toggle the changed-file diff as a side effect

#### Scenario: Expand the HTML diff normally

- **WHEN** the user activates the existing changed-file row instead of its preview action
- **THEN** the system expands or collapses the source diff using the existing behavior

### Requirement: Preview reads only the active workspace

The system SHALL obtain the selected HTML through the current OpenCode workspace file capability and MUST reject missing, binary, non-HTML, or workspace-escaping selections with a visible error in the opened tab.

#### Scenario: Workspace HTML loads successfully

- **WHEN** the selected path resolves to a text HTML file inside the active workspace
- **THEN** the preview renders that file without exposing a local `file://` URL or Bowi AI bearer credential

#### Scenario: File read fails

- **WHEN** the selected file is unavailable, binary, no longer HTML, or rejected by workspace path validation
- **THEN** the new tab shows a visible failure state
- **AND** the embedded conversation remains usable

### Requirement: Generated HTML runs in an isolated preview

The system MUST execute generated report HTML in a sandboxed child frame that has no same-origin access to OpenCode, no opener access, no form submission, no top-level navigation, and no arbitrary network connection capability. The preview SHALL support inline report code and explicitly approved CDN resources, and SHALL communicate unsupported local relative-resource behavior to the user.

#### Scenario: Generated script attempts to access OpenCode

- **WHEN** generated report script attempts to read OpenCode storage or DOM, navigate the preview shell, submit a form, or call an unapproved network endpoint
- **THEN** the browser-enforced preview policy blocks the attempt

#### Scenario: Approved single-file report renders

- **WHEN** a report uses inline HTML, CSS, and JavaScript plus an explicitly approved CDN dependency
- **THEN** the sandboxed report can render in the new tab

#### Scenario: Relative resource is unsupported

- **WHEN** a report depends on a local relative stylesheet, script, image, or other file
- **THEN** the first version is not required to resolve that resource
- **AND** the preview shell identifies that only single-file reports and approved CDN resources are supported

### Requirement: Preview remains user initiated

The system MUST open report tabs only in response to an explicit user activation and SHALL reserve the tab synchronously before asynchronously reading the workspace file so normal popup blocking does not discard a successful request.

#### Scenario: User activates a preview control

- **WHEN** the user clicks or keyboard-activates an HTML preview control
- **THEN** the system immediately opens a loading tab and completes the file read in that tab

#### Scenario: Conversation renders an HTML path

- **WHEN** an HTML path merely appears or reappears in conversation history
- **THEN** the system MUST NOT automatically open a report tab
