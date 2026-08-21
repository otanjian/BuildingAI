## Context

See `proposal.md` for motivation and `specs/agent-sensitive-word-replacement/spec.md` for observable behavior.

The current JSON configuration is `{ enabled, words, replacement, applyToReasoning }`. Its Aho-Corasick engine stores only match length and uses one global replacement. All providers already share that engine for live output and batch persistence, so the upgrade can remain localized.

Investigation also found five defects adjacent to the requested change:

1. Turning the UI switch off writes `null`, permanently discarding rules and the reasoning preference.
2. `replacement || "***"` in both UI and engine makes intentional empty-string removal impossible.
3. Agent DTOs apply only `IsObject` to this config, so malformed nested values reach the JSON column.
4. The stream adapter shares one holdback state between reasoning and answer text and flushes only on `text-end`. A baseline reproduction emitted the final reasoning character as a `text-delta` after `reasoning-end` even though all 21 existing unit tests passed.
5. OpenCode persistence batch-filters reasoning regardless of `applyToReasoning`, so live and history can disagree when reasoning replacement is disabled.

## Goals / Non-Goals

**Goals:**

- Add independent replacement values without a schema migration or provider-specific implementations.
- Make legacy and new configurations deterministic and reversible.
- Make validation, batch replacement, streaming replacement, and UI editing independently testable.
- Correct channel isolation and live/history consistency for every existing provider path.

**Non-Goals:**

- Change literal matching semantics beyond associating each match with its replacement.
- Introduce a database table, global dictionary, regex rules, fuzzy matching, or historical backfill.
- Filter user, tool, or artifact content.

## Decisions

### D1. Add rule mappings to the existing JSON value

The shared type gains `SensitiveWordReplacementRule { word, replacement }` and `SensitiveWordConfig.rules`. Legacy `words` and `replacement` remain optional and deprecated for reads and older clients.

Normalization uses this precedence:

1. If `rules` is an array, it is authoritative, including an empty array.
2. Otherwise, map each legacy `words` entry to the legacy `replacement`, defaulting only an absent legacy value to `***`.
3. New UI saves emit only `rules`, `enabled`, and `applyToReasoning`; the next successful edit naturally upgrades legacy JSON.

An empty replacement remains empty. Outer whitespace is trimmed from words, while replacement values are preserved byte-for-byte. Disabled configuration is stored with `enabled: false` instead of being replaced by `null`.

Alternatives rejected: parallel word/replacement arrays can silently drift by index; a new JSON version wrapper adds migration branches without improving behavior; a rule table is disproportionate for small per-agent dictionaries.

### D2. Validate nested rules at both boundaries

Dedicated nested DTO classes validate booleans, arrays, strings, and limits. A configuration-level validator rejects blank normalized words and ASCII case-insensitive duplicates. Limits are 500 rules, 128 Unicode code points per word, and 512 Unicode code points per replacement.

The UI uses the same limits and duplicate key semantics for immediate row feedback. API validation remains authoritative. Legacy data is normalized defensively: malformed entries are ignored and duplicates keep the first occurrence, ensuring old rows cannot break chat output.

### D3. Carry the selected rule through the matcher

Each automaton terminal stores match length, replacement, and stable input order. Match candidates therefore carry `{ start, end, replacement, order }`. Sorting remains leftmost, then longest, then stable rule order. Reconstruction slices only the original source once and inserts selected replacements, so replacement output is never fed back into matching.

This keeps O(source length + matches) scanning and preserves the existing literal, code-point-safe behavior. Sequential `replaceAll` is rejected because it is order-dependent and cascades; a generated regex is rejected because large dictionaries and cross-chunk state remain harder to control.

### D4. Give text and reasoning independent stream state

Both writer and TransformStream adapters own separate filtering states and last IDs for `text-delta` and `reasoning-delta`. Each state flushes immediately before its matching `text-end` or `reasoning-end`; stream termination provides a fallback flush with the correct channel and ID. When reasoning replacement is disabled, reasoning parts bypass state entirely.

This directly removes the reproduced cross-channel leak and prevents characters from different semantic parts forming a false match. It also supports multiple reasoning/text segments without changing provider wiring.

### D5. Apply one normalized policy to persistence

Provider live streams and persisted parts use filters built from the same normalized rules. OpenCode reasoning persistence is conditional on `applyToReasoning`, matching the direct path. Tool and data parts remain untouched.

### D6. Use an inline row editor with draft validation

The configuration card is renamed to “敏感词替换”. Each row contains word, replacement, and delete controls, plus “添加替换规则”. Existing legacy settings are expanded into rows on load. Empty replacement is explained as deletion.

Rows maintain local draft values so autosave never sends a transient blank or duplicate word while a user is editing. Valid edits update the parent config; invalid rows show inline messages. The enable switch preserves rules and only changes `enabled`.

### D7. Prove behavior with layered TDD

Pure normalization/validation tests cover legacy precedence, empty replacements, malformed data, duplicates, and limits. Engine tests cover distinct values, overlap, non-cascade, Unicode, and arbitrary chunk splits. Adapter tests reproduce reasoning-to-text leakage before fixing it and assert IDs/types. UI helper tests cover legacy hydration and draft validation; browser verification covers editing, autosave, reload, disable/re-enable, and preview output.

## Risks / Trade-offs

- [Legacy malformed JSON behaves unpredictably] → Normalize defensively at runtime and upgrade only on successful save.
- [Long words delay live output] → Enforce the 128-code-point limit so holdback remains bounded.
- [Replacement expansion increases output size] → Cap each replacement at 512 code points and rules at 500.
- [Client/server validation drifts] → Keep API authoritative and cover matching rules with tests on both sides.
- [A stream ends without a channel end event] → Flush each remaining channel during terminal stream flush using its own type and ID.
- [Rollback reads new JSON] → Keep legacy-compatible fields optional; rollback must occur only to a release that tolerates unknown JSON properties, which the current `IsObject` path does.

## Migration Plan

1. Deploy shared types, DTO validation, normalization, engine, and adapter changes together.
2. Deploy the row editor; existing agents load through legacy normalization and continue producing identical output until edited.
3. A successful save writes the new `rules` shape; no bulk database migration is required.
4. Verify direct, Coze, Dify, and OpenCode through shared engine/adapter tests plus OpenCode reasoning persistence coverage.
5. Roll back code without altering the JSON column. Existing old configs remain untouched; newly saved configs remain inert to the older engine rather than corrupting unrelated agent fields.
