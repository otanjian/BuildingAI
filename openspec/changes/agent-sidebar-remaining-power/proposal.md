## Why

Agent chat sidebar shows billing rate (`1 积分 / 1k tokens`) but not the user's remaining balance, so users cannot tell if they can afford the next turn without opening wallet settings.

## What Changes

- In agent detail chat sidebar (`AgentInfoPanel`), show **剩余 {power}** beside the consumption rate when the user is logged in
- Source remaining power from auth `userInfo.power` (same as wallet)
- After a turn that reports `userConsumedPower`, refresh `/user/info` so the sidebar balance stays current
- When not logged in or `power` is unavailable, omit the remaining-power label (do not show placeholder noise)

## Capabilities

### New Capabilities

- `agent-sidebar-remaining-power`: display and refresh remaining user power on the agent chat info panel

### Modified Capabilities

- （无）

## Impact

- Client: `packages/client/src/pages/agents/detail/chat/index.tsx` (`AgentInfoPanel`)
- Client stream: refresh user info when usage reports consumed power (`use-agent-chat-stream` and/or assistant hook)
- Reuses existing `useUserInfoQuery` / auth store; no API contract change
