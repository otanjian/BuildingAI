## Why

OpenCode agents run against a fixed workspace, but the Agent chat UI only shows conversation — users cannot browse the working directory the agent is editing. Why now: OpenCode integration already streams tools and artifacts; a Cursor-like file tree is the missing orientation surface for coding assistants.

## What Changes

- When `createMode === "opencode"`, show a header toggle (top-right of chat) that opens/closes a right-side workspace file tree panel
- BuildingAI API proxies OpenCode `GET /file` (list) and `GET /file/content` (read) with agent auth — browser never talks to OpenCode directly
- Tree is lazy-loaded on folder expand; ignored / noisy paths (e.g. `node_modules`, `.git`) are hidden or de-emphasized
- Clicking a file opens a read-only preview in the panel (text); no inline editing in MVP

**Non-goals**

- Not a full IDE (no edit, save, multi-tab editor, git decorations, ripgrep UI)
- Not for non-OpenCode agent types
- Does not replace conversation-scoped HTML artifact iframe preview
- No L3 worktree / per-conversation filesystem isolation beyond existing L2 artifacts

## Capabilities

### New Capabilities

- `opencode-workspace-file-tree`: OpenCode agent chat workspace browser — gated toggle, proxied list/read APIs, lazy file tree, read-only file preview

### Modified Capabilities

- （无）

## Impact

- **API:** `packages/api` Agent web controllers + `OpencodeApiService` file list/content helpers
- **Client:** Agent chat page header + right dock panel; reuse `@buildingai/ui` `FileTree`
- **Services:** Web client hooks for workspace tree/content endpoints
- **Ops:** Depends on reachable OpenCode serve with agent `thirdPartyIntegration` workspace config
