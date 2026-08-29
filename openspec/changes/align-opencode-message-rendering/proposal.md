## Why

OpenCode agents currently render their remote conversation in a separate iframe, so reasoning and tool calls use OpenCode's embedded presentation instead of the same interaction pattern used by ordinary BuildingAI agents. Users therefore see different collapsed summaries, icons, spacing, and detail behavior for otherwise identical agent work.

## What Changes

- Keep the iframe-based OpenCode conversation surface and its existing session URL, lifecycle, and postMessage contract.
- Update the OpenCode embedded UI so reasoning follows the ordinary agent presentation: completed reasoning grouped behind a collapsible task row, with active reasoning expanded while streaming.
- Update the OpenCode embedded UI so completed tool calls are grouped behind a collapsible tool row while individual calls retain their input, output, and status details.
- Preserve OpenCode message ordering, tool results, errors, questions, streaming status, and existing conversation/session ownership.
- Keep the OpenCode iframe as the only conversation renderer; do not replace it with a native BuildingAI panel.

## Capabilities

### New Capabilities

- `opencode-iframe-message-rendering`: Consistent BuildingAI-style rendering of reasoning and tool-call messages inside the OpenCode iframe.

### Modified Capabilities

- `opencode-iframe-header-parity`: Preserve the existing iframe architecture while aligning its message presentation with ordinary BuildingAI agents.

## Impact

- OpenCode session-ui message grouping and embedded styles.
- OpenCode iframe usage and embedded UI integration.
- Focused OpenCode tests, type checks, and browser verification.

## Non-goals

- Do not change model behavior, reasoning generation, tool permissions, or OpenCode session persistence.
- Do not alter ordinary non-OpenCode agents.
- Do not replace the iframe with a native panel or redesign the shared BuildingAI message components.
