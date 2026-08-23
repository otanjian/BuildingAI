## Why

BuildingAI already provides agent navigation and workspace context around the embedded OpenCode conversation. Repeating OpenCode's review/file panel and session-header action cluster inside that embed consumes conversation space and presents controls that are not needed in this product surface.

Why now: the embedded conversation is being used for generated artifacts and long assistant output, where the duplicated right-side chrome materially reduces readability.

## What Changes

- Hide the entire OpenCode review/file side panel while the page is running in the explicit BuildingAI embed mode.
- Hide the session-header status indicator and overflow menu cluster in that same embed mode.
- Let the conversation use the space released by the hidden panel.
- Preserve both UI areas for normal direct OpenCode routes.

Non-goals:

- Removing review, file browsing, or session actions from OpenCode itself.
- Changing BuildingAI's own left navigation, agent header, or conversation history.
- Changing assistant content, changed-file summaries, or HTML artifact preview behavior.

## Capabilities

### New Capabilities

- `opencode-embed-shell-simplification`: Defines which redundant OpenCode shell controls are absent in the explicit BuildingAI embed and how direct routes remain unaffected.

### Modified Capabilities

None.

## Impact

- OpenCode app session layout and session header rendering.
- BuildingAI's existing `buildingaiEmbed=1` integration contract.
- No API, persistence, dependency, or authorization changes.
