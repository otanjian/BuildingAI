## 1. Layout — resizable splits

- [x] 1.1 Wire Chat | Workspace `ResizablePanelGroup` on agent chat page when workspace open; min/max constraints
- [x] 1.2 Persist outer workspace size to localStorage and restore on open
- [x] 1.3 Refactor `OpencodeWorkspacePanel` to Tree | Preview horizontal split with empty preview state
- [x] 1.4 Persist optional inner split ratio; verify desktop-only behavior

## 2. Copy relative path

- [x] 2.1 Add copy-relative-path helper + toast; unit or lightweight test if pure helper extracted
- [x] 2.2 Add per-row copy icon on file/folder rows without breaking select/expand
- [x] 2.3 Add context menu action「复制相对路径」on tree rows

## 3. Preview chrome

- [x] 3.1 Preview path bar with truncate + copy control
- [x] 3.2 Empty state when no file selected; keep loading/error states

## 4. Verification

- [x] 4.1 Manual: resize outer/inner; copy via icon and context menu; click still previews
- [x] 4.2 `openspec validate opencode-workspace-panel-ux`; mark tasks complete
