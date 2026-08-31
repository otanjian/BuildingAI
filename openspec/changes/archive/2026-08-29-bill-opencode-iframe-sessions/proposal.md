## Why

OpenCode iframe conversations send prompts directly to OpenCode, so BuildingAI does not receive a
durable turn and never records token usage or deducts points. Why now: Rock's active conversations
on 2026-08-23 exposed this production billing gap while the iframe experience must remain in place.

## What Changes

- Initialize a billing cursor before an OpenCode iframe is returned to the browser, so pre-existing
  session history is not charged automatically.
- Reconcile initialized iframe sessions every 30 minutes from the BuildingAI API process.
- When a session is idle, aggregate each newly completed user turn's OpenCode-reported usage and
  apply the existing OpenCode points rule.
- Persist a per-conversation cursor and cumulative usage in existing conversation metadata, and use
  a deterministic turn association number for idempotent account logs.
- Continue processing other sessions when one OpenCode runtime or deduction fails.

**Non-goals**

- Replacing or modifying the iframe experience.
- Asking the model to call Bowi MCP for billing.
- Automatically back-charging OpenCode usage that predates billing-cursor initialization.
- Converting OpenCode USD cost into platform points.

## Capabilities

### New Capabilities

- `opencode-iframe-billing`: Periodic, durable, idempotent token settlement for OpenCode sessions
  used through the iframe.

### Modified Capabilities

- None.

## Impact

- **API:** OpenCode embed initialization, a new scheduled reconciliation service, existing OpenCode
  API integration, token normalizer, agent billing handler, and Agents module registration.
- **Database:** No migration; cursor and cumulative usage use `ai_agent_chat_record.metadata`, while
  existing account-log uniqueness protects deductions.
- **Operations:** One reconciliation run every 30 minutes; delayed account-detail visibility is
  expected.
