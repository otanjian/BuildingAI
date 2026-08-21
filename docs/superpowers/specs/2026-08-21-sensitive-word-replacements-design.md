# Sensitive-word replacement upgrade design

## Outcome

Upgrade the per-agent output control from a list of words sharing one replacement to an ordered list of explicit word-to-replacement mappings. Keep the existing JSON column and all provider integration points, while fixing stream channel leakage, configuration loss on disable, invalid nested values, empty replacement handling, and reasoning live/history inconsistency.

The canonical product scope and detailed technical decisions are in:

- `openspec/changes/upgrade-agent-sensitive-word-replacements/proposal.md`
- `openspec/changes/upgrade-agent-sensitive-word-replacements/specs/agent-sensitive-word-replacement/spec.md`
- `openspec/changes/upgrade-agent-sensitive-word-replacements/design.md`

## Approved interaction

Use an inline row editor. Each row contains a sensitive word, its replacement value, and a delete action. Administrators can add multiple rules, use an empty replacement to remove matched source text, and disable replacement without losing rules. Blank words and ASCII case-insensitive duplicates remain local drafts with inline errors and are not autosaved.

## Approved architecture

- Extend the existing config with `rules: Array<{ word, replacement }>` and retain deprecated legacy fields for compatibility.
- Treat `rules` as authoritative when present; otherwise map the legacy word list to its shared replacement.
- Validate nested values and bounded sizes at the API boundary.
- Store a rule-specific replacement on each automaton terminal and reconstruct from the original source once, preserving longest-first, non-overlapping, non-cascading behavior.
- Maintain independent streaming state for answer text and reasoning, flushing each before its own end event.
- Use the same normalized rules for live output and persisted parts; honor the reasoning flag in both.
- Implement through failing tests first, then verify types, API tests, client helper tests, builds, OpenSpec validation, and browser behavior.

## Verified root cause

The existing 21 sensitive-word tests pass, but a reproduction using `reasoning-start → reasoning-delta → reasoning-end → text-start → text-delta → text-end` moves the final held-back reasoning character into a later `text-delta`. One shared stream filter is crossing semantic channels. Independent channel state is therefore a correctness fix, not an optional refactor.
