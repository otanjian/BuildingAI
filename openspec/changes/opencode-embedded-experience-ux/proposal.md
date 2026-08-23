## Why

The embedded OpenCode agent page currently wastes a large portion of the workspace on a duplicate
placeholder, does not resume the user's latest conversation, and separates existing file and
presentation capabilities from the iframe experience. Why now: the iframe is now the established
OpenCode renderer, so the surrounding BuildingAI experience should become focused and coherent
without replacing or restructuring that iframe integration.

## What Changes

- Remove the redundant BuildingAI placeholder column so the existing OpenCode iframe occupies the
  conversation workspace.
- Add a BuildingAI-owned project-files action in the existing iframe header that opens the shipped
  workspace browser without remounting or resizing the iframe.
- Preserve lazy browsing, file preview, and relative-path copy; add single-file download and
  consistently hide dot-prefixed paths.
- When an OpenCode agent is entered without a conversation ID, resume the latest non-archived
  conversation or create a draft only when none exists.
- In explicit `buildingaiEmbed=1` mode, align OpenCode's background, typography, reasoning, tool,
  and final-answer presentation with BuildingAI while retaining OpenCode's native structured parts.
- Keep the existing `OpencodeIframePanel`, iframe element, embed URL/session mapping,
  authentication, loading/error behavior, and iframe lifecycle unchanged.

**Non-goals:** replacing the iframe with a native conversation panel; changing prompt/session
transport; adding file editing, folder archive download, large-file streaming, or heuristic
splitting of plain text into reasoning.

## Capabilities

### New Capabilities

- `opencode-embedded-experience-ux`: Focused iframe workspace layout, latest-conversation entry
  behavior, overlay project-file access, file download, and embed-only visual presentation.

### Modified Capabilities

- None.

## Impact

- **Client:** OpenCode agent detail layout, shared iframe header actions, existing workspace panel,
  and lightweight pure helpers/tests.
- **API/services:** Existing OpenCode file-content proxy and web service types; no new route or
  database migration.
- **OpenCode workspace runtime:** Embed-only theme/presentation styles and structured reasoning
  visibility; direct OpenCode routes remain unchanged.
- **Deployment:** Rebuild the managed OpenCode web bundle/binary and BuildingAI client after
  verification.
