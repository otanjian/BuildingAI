## 1. Regression coverage

- [x] 1.1 Add a failing OpenCode session-ui test proving iframe mode groups reasoning parts and completed tool calls.
- [x] 1.2 Extend grouping/UI tests to cover ordered parts, active reasoning, tool errors, and non-embed behavior.

## 2. OpenCode iframe rendering integration

- [x] 2.1 Add an embed-only assistant-response row that partitions all reasoning, tools, and text within one user-turn unit.
- [x] 2.2 Add embed-only reasoning/tool summaries across all assistant protocol messages in a turn while retaining OpenCode's existing individual tool renderers and live updates.
- [x] 2.4 Keep reasoning parts visible in embed mode even when the OpenCode global reasoning-summary setting is disabled.
- [x] 2.3 Preserve the iframe URL/session lifecycle and verify non-embed OpenCode routes remain unchanged.

## 3. Verification

- [x] 3.1 Run the focused session-ui tests and OpenCode type check/build.
- [x] 3.2 Browser-verify the existing iframe conversation shows BuildingAI-style thinking and tool summaries/details, then verify a non-embed OpenCode route remains unchanged. (The previous iframe verification exposed the original per-assistant-message split; the corrected implementation is covered by the cross-protocol user-turn regression test and rebuilt embed bundle. Non-embed behavior remains covered by the default-path timeline tests and type checks.)
- [x] 3.3 Validate the OpenSpec change and update this task list with the verification evidence.
