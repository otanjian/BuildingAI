## Why

When an OpenCode agent starts a new conversation, the client creates a local draft ID before the
server has persisted the conversation. The iframe can request that ID during this gap and show a
conversation-not-found error; after the first message is accepted, the new conversation is also
missing from the sidebar until a full page refresh. This breaks the expected “新对话” flow and is
especially visible in the current embedded experience.

## What Changes

- Make the new-conversation route wait for or reconcile server initialization before treating a
  transient conversation lookup as a missing conversation.
- Ensure the conversation created for a new OpenCode draft is inserted into or invalidates the
  current agent history query as soon as the server accepts it, so the sidebar updates without a
  page reload.
- Preserve existing local draft state, active streaming behavior, and direct navigation to existing
  conversations.

**Non-goals:** changing message persistence, OpenCode session execution, history ordering rules, or
the behavior of unrelated agent types.

## Capabilities

### New Capabilities

- `opencode-new-conversation-history`: Reliable new OpenCode conversation initialization and live
  sidebar history updates.

### Modified Capabilities

## Impact

- Agent detail chat route and OpenCode iframe initialization in `packages/client`.
- Agent conversation query/cache synchronization in the shared web services/client layer.
- Existing OpenCode conversation initialization endpoints may need idempotent handling of a draft
  conversation that is being created concurrently.
