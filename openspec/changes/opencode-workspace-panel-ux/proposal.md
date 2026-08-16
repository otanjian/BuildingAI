## Why

OpenCode workspace panel MVP is usable but not IDE-like: fixed width, stacked tree/preview, and no way to copy paths for chat prompts. Why now: users already browse the tree; resizing and Cursor-style path copy + side-by-side preview are the highest-leverage UX upgrades.

## What Changes

- Make the Workspace dock horizontally resizable against chat (persist width)
- Inside Workspace, split **tree | preview** horizontally (resizable), replacing stacked layout
- Keep single-click to open/preview files; add **row copy icon** and **context menu** to copy relative path (toast feedback)
- Improve preview chrome (path bar + copy); keep read-only (no edit)

**Non-goals**

- Multi-tab editor, file save/edit, absolute-path-only flows as primary
- Syntax highlighting requirement (nice-to-have if cheap; not blocking)
- Changing OpenCode proxy APIs

## Capabilities

### New Capabilities

- `opencode-workspace-panel-ux`: Resizable workspace dock, tree|preview horizontal split, copy relative path via icon and context menu

### Modified Capabilities

- （无）— builds on shipped `opencode-workspace-file-tree` without changing its API contract

## Impact

- **Client:** Agent chat layout + `OpencodeWorkspacePanel`
- **UI:** Reuse `@buildingai/ui` `resizable` / context menu / toast patterns
- **API:** None
