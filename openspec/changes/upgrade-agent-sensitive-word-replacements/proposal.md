## Why

The current per-agent sensitive-word feature accepts multiple words but gives every word the same replacement value. Administrators cannot express safe substitutions such as replacing an internal project name with a public alias while masking an API key, and the existing stream adapter can mix held-back reasoning text into the answer channel.

## Why now

Sensitive-word replacement is already used on all agent types, so ambiguous configuration and cross-channel stream leakage affect live output and persisted history across the product. Upgrading the existing capability now avoids accumulating more legacy configuration while preserving all existing agent settings.

## What Changes

- Replace the shared word-list/global-value editor with explicit per-word replacement rules.
- Preserve existing `words` plus `replacement` JSON configurations and normalize them into rule mappings without a database migration.
- Support distinct values per word and intentional removal through an empty replacement value.
- Reject blank words, case-insensitive duplicate words, oversized rules, and malformed nested configuration at the API boundary; surface equivalent validation in the UI.
- Keep text and reasoning stream state independent, flush each channel at its own end event, and make live output match persisted history while respecting the reasoning toggle.
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
- Existing provider wiring remains in place and continues using the shared engine.
- No new dependency, table, column, or destructive data migration.

## Non-goals

- Fuzzy matching, homophone detection, regular-expression rules, or input-side moderation.
- Rewriting existing persisted conversations.
- Filtering tool input/output, generated artifacts, or user messages.
- Platform-wide shared dictionaries or rule management outside each agent.
