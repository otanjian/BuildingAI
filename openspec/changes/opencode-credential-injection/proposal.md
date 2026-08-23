## Why

OpenCode sessions currently receive a deliberately masked SAP password, but the MCP execution path has no server-side way to resolve that credential. The model therefore repeatedly asks the user for a password even though BuildingAI already has it in the authenticated user's personal parameters. This blocks the primary SAP workflow now that OpenCode Web is embedded as the chat surface.

## What Changes

- Add a server-to-server credential resolution path for OpenCode MCP tool calls.
- Resolve the authenticated conversation owner and personal parameters from the OpenCode session mapping.
- Inject only the required SAP credential immediately before `sap_connect` executes.
- Advertise managed SAP credentials to the model so it calls `sap_connect` directly instead of asking the user to paste a password.
- Keep passwords out of model context, browser URLs, persisted OpenCode messages, tool metadata, logs, and tool results.
- Preserve the existing masked session-context behavior and leave non-OpenCode agents unchanged.

## Capabilities

### New Capabilities

- `opencode-credential-injection`: Resolve and inject BuildingAI-managed credentials for OpenCode tool execution without exposing them to the model or UI.

### Modified Capabilities

- None.

## Impact

- BuildingAI API: internal credential-resolution endpoint, conversation lookup, and SAP personal-parameter parsing.
- OpenCode runtime: MCP tool schema/policy adaptation, execution wrapper, and configurable BuildingAI API connection.
- OpenCode Web and persisted session history remain unchanged from the user's perspective.
