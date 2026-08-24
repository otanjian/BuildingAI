## Why

OpenCode currently reports generated HTML by printing a workspace path, and its embedded preview opens on the OpenCode runtime rather than through BuildingAI. Users cannot reliably click the final report from the conversation or recognize it as a BuildingAI-hosted result.

Why now: BuildingAI is the unified business-tool entry point, so generated reports must return through the active BuildingAI conversation and its default web endpoint instead of exposing runtime-local navigation.

## What Changes

- Add an authenticated BuildingAI report-view route scoped to the active Agent and conversation.
- Pass that route context into the embedded OpenCode session so eligible HTML report references open on the BuildingAI origin (the local default is port `4091`).
- Require report-producing turns to cite each concrete `.html`/`.htm` output by filename only, without exposing its containing directory or absolute workspace path.
- Keep existing source/diff interactions intact and show a clear error when a report is missing or unauthorized.
- Preserve the current conversation-artifact ownership and path-containment checks.

Non-goals:

- Publishing reports as anonymous public URLs.
- Serving arbitrary workspace files or entire artifact directories.
- Replacing the existing artifact-card preview used by non-embedded Agent chat.

## Capabilities

### New Capabilities

- `opencode-buildingai-report-links`: Clickable, conversation-scoped HTML report links from embedded OpenCode to a BuildingAI report viewer.

### Modified Capabilities

None.

## Impact

- BuildingAI Agent embed URL/context construction and report-generation instructions.
- BuildingAI client routing and authenticated report rendering.
- Embedded OpenCode HTML-path actions and their focused tests.
- No database migration or new external dependency.
