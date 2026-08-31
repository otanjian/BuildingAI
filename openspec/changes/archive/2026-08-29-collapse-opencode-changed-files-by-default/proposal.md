## Why

Completed OpenCode turns currently render every changed-file row immediately, which gives implementation details too much visual weight and makes the conversation harder to scan. This is especially distracting for report-generation turns that create several supporting files.

Why now: BuildingAI now opens generated reports directly, so changed files should remain available as secondary detail without dominating the result.

## What Changes

- Collapse the changed-file list by default while keeping the file count and aggregate additions/deletions visible.
- Make the changed-file summary an accessible control that expands or collapses the complete file list.
- Preserve the existing per-file diff expansion, HTML report preview action, and large-list “show all/show less” behavior after the group is expanded.
- Non-goals: changing how diffs are calculated, changing report routing, or hiding changed-file information permanently.

## Capabilities

### New Capabilities

- `opencode-collapsible-changed-files`: Defines the default collapsed state and user-controlled expansion behavior for changed-file summaries in OpenCode conversations.

### Modified Capabilities

- None.

## Impact

- Affects the OpenCode session timeline and its shared session-turn styling/component behavior.
- Requires rebuilding the managed OpenCode runtime used by BuildingAI on port `4096`.
- No API, persistence, MCP, or report-serving contract changes.
