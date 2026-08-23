## Why

The agent detail sidebar currently requests conversation history by last update time, so sending a message or changing a title can move an older conversation ahead of newer conversations. Users need the history order to reflect when each conversation was created and remain stable during later activity.

Why now: the sidebar is now updated live after conversation creation and title generation, making a stable, predictable creation-time order necessary.

## What Changes

- Order the agent detail conversation history by `createdAt` descending (newest-created conversation first).
- Keep a conversation in the same relative creation-time position when its title or messages update.
- Add regression coverage for the creation-time sort contract.

Non-goals: changing the admin conversation log sort controls, the homepage unified history API, pagination size, or conversation creation behavior.

## Capabilities

### New Capabilities

- `agent-history-creation-order`: Defines the creation-time ordering contract for the agent detail conversation history.

### Modified Capabilities

None.

## Impact

- Affects the agent detail chat sidebar query in `packages/client`.
- Reuses the existing conversation API `sortBy=createdAt` support; no API or database schema change is required.
- Adds a focused client regression test.
