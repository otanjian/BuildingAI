## Context

Shipped `opencode-workspace-file-tree`: fixed ~20rem right dock, stacked tree above preview, click selects file. UI already has `resizable` (`react-resizable-panels`) and clipboard+toast patterns. See proposal for motivation.

## Goals / Non-Goals

**Goals:**

- Chat | Workspace horizontal resize with persisted width
- Workspace internal Tree | Preview horizontal resize
- Copy relative path via row icon + context menu; click keeps preview/expand

**Non-Goals:**

- Edit/save, multi-tabs, API changes
- Mandatory syntax highlighting (optional if existing `code-block` is trivial to wire)

## Decisions

### 1. Outer split owned by chat page; inner split owned by panel

`AgentChatPage` wraps chat column + `OpencodeWorkspacePanel` in `ResizablePanelGroup` direction horizontal when workspace open. Panel itself uses a nested `ResizablePanelGroup` for tree | preview.

**Rationale:** Outer width is a page layout concern; inner split is panel UX.

**Alternatives:** Single group with three panels — rejected (harder to hide workspace cleanly).

### 2. Persist outer width (and optionally inner) in localStorage

Keys like `__opencode_workspace_width__` / `__opencode_workspace_inner__`. Default outer ~320px; min ~240; max ~min(560, 50vw).

### 3. Copy UX = icon (D) + context menu (B)

- Primary click unchanged
- Hover/always-visible small copy button on row (`FileTree` `actions`/`trailing` slot if available)
- `ContextMenu` on row: “复制相对路径”
- Path = entry `path` from API (workspace-relative)
- `navigator.clipboard.writeText` + `toast.success`

### 4. Preview chrome

Path bar with truncate + copy button; empty state copy; keep `<pre>` read-only for MVP. Syntax highlight deferred unless cheap.

### 5. No API changes

Reuse existing list/content endpoints.

## Risks / Trade-offs

- **[Risk] Nested resizable panels + mobile** → Mitigation: keep workspace desktop-only (`md+`) as today
- **[Risk] FileTree slots insufficient for menu** → Mitigation: wrap row in context menu trigger; fall back to custom row wrapper
- **[Trade-off] Absolute path omitted** → Can add as second menu item later

## Migration Plan

Additive UI only; rollback by reverting client files.

## Open Questions

- None blocking.
