## Why

The OpenCode agent currently shows its own browser title bar inside the right iframe while BuildingAI shows a separate chat header in the center. The duplicate navigation controls make one conversation look like two unrelated workspaces and make the iframe feel less integrated. This is needed now because OpenCode is the sole renderer for OpenCode agents, so the surrounding controls must have one consistent owner and visual language.

## What Changes

- Add a BuildingAI embed mode for OpenCode Web that removes the native OpenCode titlebar/session-tab strip from the iframe.
- Render the same sidebar toggle, back navigation, and agent identity controls above the OpenCode iframe as the middle BuildingAI chat header.
- Render the current BuildingAI conversation title in that parent header beside the agent avatar.
- Remove the duplicate OpenCode session-title row from the embedded message timeline while keeping it for direct OpenCode routes.
- Keep BuildingAI as the owner of agent navigation and conversation history; do not expose OpenCode session tabs in the embedded view.
- Preserve the existing OpenCode Web conversation renderer, composer, question cards, task progress, tool events, and file views.
- Limit the change to agents with `createMode=opencode`; all other agent chat headers remain unchanged.

## Capabilities

### New Capabilities

- `opencode-iframe-header-parity`: Consistent BuildingAI-owned header controls for embedded OpenCode conversations.

### Modified Capabilities

None.

## Impact

- BuildingAI client OpenCode iframe panel and chat layout.
- OpenCode Web titlebar rendering and its embedded route query handling.
- OpenCode URL construction and focused UI/runtime verification.
