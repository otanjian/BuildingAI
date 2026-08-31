## 1. Sidebar UI

- [x] 1.1 In `AgentInfoPanel`, read `userInfo?.power` and render `剩余 {n}` beside consumption rate when defined
- [x] 1.2 Hide remaining label when not logged in / power undefined

## 2. Refresh after billing

- [x] 2.1 On agent chat `data-usage` with positive `userConsumedPower`, invalidate `["user", "info"]`
- [x] 2.2 Confirm OpenSpec validate passes; mark tasks done
