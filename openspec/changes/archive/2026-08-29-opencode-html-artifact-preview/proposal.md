## Why

Embedded OpenCode conversations can generate HTML reports, but the paths shown in assistant replies and changed-file summaries are inert, forcing users to copy paths or leave the conversation to find the result. Why now: the iframe is the authoritative OpenCode chat surface and already has workspace-scoped file access, so reports can be made directly usable without exposing BuildingAI credentials or local `file://` URLs.

## What Changes

- Make `.html` and `.htm` paths in embedded OpenCode assistant replies actionable.
- Add an explicit browser-preview action for HTML entries in the turn changed-file summary while preserving the existing diff interaction.
- Read selected reports through OpenCode's workspace-scoped file API and open them from the user's click in a new browser tab.
- Run generated HTML inside an isolated preview frame with a restrictive resource policy and visible loading/error states.
- Keep direct, non-BuildingAI OpenCode routes and non-HTML file behavior unchanged.

**Non-goals:** automatic report popups, `file://` navigation, arbitrary paths outside the active workspace, a general web server for artifact directories, or support for local relative CSS/JavaScript/image trees in the first version.

## Capabilities

### New Capabilities

- `opencode-html-artifact-preview`: Safe, user-initiated browser preview of workspace HTML files referenced by an embedded OpenCode conversation.

### Modified Capabilities

- None.

## Impact

- OpenCode web/session UI path decoration, timeline changed-file actions, preview helper, styles, localization, and focused tests in the adjacent workspace runtime.
- Existing OpenCode `file.read` API; no new BuildingAI API, database, authentication, or iframe URL contract.
- OpenSpec contract and verification evidence in BuildingAI.
