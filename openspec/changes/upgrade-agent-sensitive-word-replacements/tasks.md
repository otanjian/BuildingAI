## 1. Configuration contract and normalization

- [ ] 1.1 Add failing tests for new rule mappings, legacy precedence, empty replacements, malformed entries, duplicate handling, and size limits
- [ ] 1.2 Extend shared types with replacement rules and legacy-compatible optional fields
- [ ] 1.3 Implement a shared backend normalizer/validator and make all runtime filter creation consume its canonical rules
- [ ] 1.4 Add nested create/update DTO validation for rule shape, booleans, duplicate words, and configured limits

## 2. Rule-specific replacement engine

- [ ] 2.1 Add failing batch tests for distinct replacements, empty deletion, same-start overlap, stable duplicate behavior, non-cascading output, and Unicode boundaries
- [ ] 2.2 Update automaton terminals and match intervals to carry the selected rule's replacement while preserving literal longest-first matching
- [ ] 2.3 Add failing streaming tests proving arbitrary chunk splits equal batch output for multiple replacements
- [ ] 2.4 Implement bounded, rule-aware stream filtering and keep disabled/no-rule paths as passthrough

## 3. Stream channel and persistence correctness

- [ ] 3.1 Add failing writer and TransformStream regressions reproducing reasoning-tail leakage into answer text and preserving channel IDs
- [ ] 3.2 Give answer text and reasoning independent filter state and flush each before its matching end event, with terminal fallback flushes
- [ ] 3.3 Add provider/service tests for `applyToReasoning=false` live/history parity and correct OpenCode reasoning persistence
- [ ] 3.4 Update provider persistence wiring only where needed so all agent types use the same normalized policy

## 4. Per-rule configuration UI

- [ ] 4.1 Extract pure client helpers and add failing tests for legacy hydration, canonical save shape, duplicate detection, empty replacement, and limits
- [ ] 4.2 Replace the textarea/global replacement UI with the approved inline row editor, add/delete controls, inline validation, and accessible labels
- [ ] 4.3 Preserve rules when toggled off and prevent transient invalid drafts from reaching configuration autosave
- [ ] 4.4 Update labels and guidance from sensitive-word filtering to per-word replacement semantics

## 5. Verification and documentation

- [ ] 5.1 Run focused API and client tests, then related full suites, lint, and type checks with Node 22.20+
- [ ] 5.2 Run `openspec validate upgrade-agent-sensitive-word-replacements` and review the final diff for unrelated changes or unresolved placeholders
- [ ] 5.3 Start with `start.sh` and browser-verify legacy load, distinct replacements, empty deletion, validation, autosave/reload, disable/re-enable, reasoning toggle, and live/history parity
- [ ] 5.4 Update OpenSpec task checkboxes immediately after each verified task and document any remaining deployment-only verification
