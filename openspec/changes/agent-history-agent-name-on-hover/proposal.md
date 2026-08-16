## Why

Global sidebar history currently prefixes every agent conversation with the agent name (`Bowi AI开发助手 当前的项目结构`). In the narrow nav, the title is the primary signal and the agent name adds visual noise. Users want the agent name hidden by default and revealed only when hovering the history row.

## What Changes

- Sidebar history rows (`ConversationSubItem`): show conversation title only by default; fade in agent name on hover (inline, before title)
- Keep agent name available to assistive tech when visually hidden (`sr-only` / accessible label)
- Apply the same hover reveal behavior in the "view all history" command dialog (`HistoryCommandItem`) for consistency
- Non-agent (direct chat) history rows remain title-only (no change)

## Capabilities

### New Capabilities

- `agent-history-title-display`: hover-to-reveal agent name on unified history list items

### Modified Capabilities

- （无）

## Impact

- UI package: `packages/@buildingai/web/ui/src/layouts/styles/default/_components/default-nav-main.tsx` (and a small extracted presentational helper if useful for tests)
- No API / DB / agent chat page side-history changes
