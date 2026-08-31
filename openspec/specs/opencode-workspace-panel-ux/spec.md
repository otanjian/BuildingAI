# opencode-workspace-panel-ux Specification

## Purpose
Improves the OpenCode Agent chat Workspace panel so users can resize the dock, browse and preview files side by side, and copy workspace-relative paths without leaving the tree—matching common Cursor/VS Code auxiliary panel patterns while staying read-only.
## Requirements
### Requirement: Resizable workspace dock
When the OpenCode workspace panel is open, the system SHALL allow the user to drag a vertical handle to resize the workspace width relative to the chat column. Width SHALL be constrained to a usable minimum and maximum. The last chosen width SHOULD persist across sessions for the same browser (e.g. localStorage).

#### Scenario: Drag to resize workspace
- **WHEN** the workspace panel is open and the user drags the vertical resize handle between chat and workspace
- **THEN** the workspace width updates within the allowed min/max range and the chat column fills the remaining space

#### Scenario: Width persists
- **WHEN** the user resizes the workspace and later reopens the workspace panel in the same browser
- **THEN** the workspace opens at approximately the previously chosen width

### Requirement: Horizontal tree and preview split
Inside the workspace panel, the system SHALL show the file tree and the file preview side by side (tree on the left, preview on the right), with a vertical drag handle between them. Selecting a file SHALL load its content into the preview pane. When no file is selected, the preview pane SHALL show an empty state prompting the user to select a file.

#### Scenario: Side-by-side layout
- **WHEN** the workspace panel is open
- **THEN** the file tree and preview appear in a horizontal split, not stacked vertically as the sole layout

#### Scenario: Select file fills preview
- **WHEN** the user selects a file in the tree
- **THEN** the preview pane shows that file's read-only content (or an error if content cannot be loaded)

#### Scenario: Empty preview state
- **WHEN** no file is selected
- **THEN** the preview pane shows a short empty-state message instead of file content

#### Scenario: Resize tree vs preview
- **WHEN** the user drags the handle between tree and preview
- **THEN** the relative widths of tree and preview update within allowed constraints

### Requirement: Copy relative path via icon and context menu
Single-click on a file SHALL continue to select/open preview; single-click on a folder SHALL continue to expand/collapse. The system SHALL provide a per-row control (icon) and a context menu action to copy the entry's workspace-relative path to the clipboard, with user-visible success feedback. Copy MUST NOT replace the primary click behavior.

#### Scenario: Copy via row icon
- **WHEN** the user activates the copy control on a tree row
- **THEN** the workspace-relative path is copied to the clipboard and a success toast (or equivalent) is shown

#### Scenario: Copy via context menu
- **WHEN** the user opens the context menu on a tree row and chooses copy relative path
- **THEN** the workspace-relative path is copied to the clipboard and a success toast (or equivalent) is shown

#### Scenario: Click still previews
- **WHEN** the user single-clicks a file row (not the copy control)
- **THEN** the file is selected for preview and the clipboard is not cleared or overwritten solely by that click

