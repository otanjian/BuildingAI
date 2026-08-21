## Why

The current per-agent sensitive-word feature accepts multiple words but gives every word the same replacement value. Administrators cannot express safe substitutions such as replacing an internal project name with a public alias while masking an API key, and the existing stream adapter can mix held-back reasoning text into the answer channel.

## Why now

Sensitive-word replacement is already used on all agent types, so ambiguous configuration and cross-channel stream leakage affect live output and persisted history across the product. Upgrading the existing capability now avoids accumulating more legacy configuration while preserving all existing agent settings.

## What Changes

- Replace the shared word-list/global-value editor with explicit per-word replacement rules.
- Preserve existing `words` plus `replacement` JSON configurations and dual-write a fail-closed legacy mask so rolling deploys and rollbacks never disable replacement.
- Support distinct values per word and intentional removal through an empty replacement value.
- Reject blank words, case-insensitive duplicate words, oversized rules, and malformed nested configuration at the API boundary; surface equivalent validation in the UI.
- Isolate stream state by part type and ID, flush safely on part and terminal boundaries, and make live output match persisted history while respecting the reasoning toggle.
- Apply the policy to chat replies and assistant-generated display strings, including model text/reasoning, quick-command, annotation and operator replies, follow-up suggestions, and top-level errors, while leaving tool payloads and artifacts untouched.
- Close public-read bypasses by projecting opening content and never returning the dictionary from ordinary detail, published detail, or square-list responses.
- Preserve replacement invariants during tool-approval continuations and save sensitive rules through a revisioned subresource that is isolated from full-page autosave.
- Make the sensitive JSON column immutable to ordinary ORM updates so unrelated saves and delayed third-party synchronization cannot restore a stale rule revision.
- Keep matching literal, ASCII case-insensitive, longest-first, non-overlapping, and non-cascading.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent-sensitive-word-replacement`: Upgrade per-agent configuration from one shared replacement string to validated per-word mappings and strengthen stream/history consistency across text and reasoning channels.

## Impact

- Shared agent config types and nested API DTO validation.
- Sensitive-word matching engine and AI SDK stream adapters.
- Agent configuration UI and autosave normalization.
- Five provider HTTP stream boundaries, assistant-message persistence, and agent update paths.
- No new dependency, table, column, or destructive data migration.

## Non-goals

- Fuzzy matching, homophone detection, regular-expression rules, or input-side moderation.
- Rewriting existing persisted conversations.
- Filtering tool input/output, generated artifacts, or user messages.
- Platform-wide shared dictionaries or rule management outside each agent.
