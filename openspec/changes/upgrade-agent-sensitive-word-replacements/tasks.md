## 1. Configuration contract and normalization

- [ ] 1.1 Add failing shared-utility tests for legacy revision-0 retention/canonical initialization, lenient stored-legacy cleanup, canonical fail-closed fallback/errors, disable/immediate re-enable, accepted old-client toggles, rejected old-client mapping edits, malformed entries, duplicates, and code-point limits
- [ ] 1.2 Extend shared types with replacement rules and legacy-compatible optional fields
- [ ] 1.3 Implement an isomorphic canonical config utility with normalization/comparison plus a server-owned storage serializer for regenerated shadows, fail-closed fallback/turn rejection, redacted diagnostics, old-client toggle preservation, and stale legacy edit conflicts
- [ ] 1.4 Add failing subresource concurrency tests and implement row-locked revision check/increment plus the sole parameterized sensitive-column writer
- [ ] 1.5 Add strict canonical subresource DTOs and compatibility-aware general-update DTO validation; keep create null/default and reject canonical rule mutation outside the subresource
- [ ] 1.6 Add the sensitive-config service endpoint and limit general PATCH handling to null/unchanged-shadow switches plus read-only canonical echoes (current echo may toggle, stale echo is ignored, mapping edits conflict)
- [ ] 1.7 Add failing metadata/delayed-write race tests and mark the sensitive column `update: false` so ordinary Agent saves, including delayed Coze/Dify sync writebacks, cannot include stale sensitive JSON

## 2. Rule-specific replacement engine

- [ ] 2.1 Add failing batch tests for distinct replacements, empty deletion, same-start overlap, non-cascading output, and Unicode boundaries
- [ ] 2.2 Update automaton terminals and match intervals to carry the selected rule's replacement, use cursor-based BFS construction, and preserve literal longest-first matching
- [ ] 2.3 Add failing streaming tests proving arbitrary chunk splits equal batch output and unrelated text is not delayed by a long rule
- [ ] 2.4 Implement incremental prefix-aware adaptive holdback for unresolved rule candidates and keep disabled/no-rule paths as passthrough

## 3. Stream channel and persistence correctness

- [ ] 3.1 Add failing outbound TransformStream regressions for cross-channel leakage, same-channel/different-ID contamination, deltas without starts/IDs, repeated starts, unknown/missing/duplicate ends, synthetic close at message/step/final/error/EOF boundaries, 32-part overflow termination, terminal late-chunk suppression, data allowlisting, and latest-metadata/ID preservation
- [ ] 3.2 Implement one part-ID-aware outbound projection with boundary flush and final synthetic-close semantics, connect it before all five HTTP stream pipes, and remove provider-specific live filtering plus the direct inner transform
- [ ] 3.3 Add provider/service tests that preflight immutable policy snapshots before side effects and cover `applyToReasoning=false`, OpenCode persistence, standard pre-header errors, valid projected post-header `errorText` chunks, and published-detail/copy fail-closed behavior
- [ ] 3.4 Add failing batch/rich-text projector and service tests; implement exactly-once projection for text/reasoning, quick-command replies, annotation replies, operator replies, opening statements, follow-up suggestions, and new assistant context entries
- [ ] 3.5 Make generic detail owner-only; add minimal allowlist published/square DTOs; expose/project opening statements; omit public quick-command configuration; project copied custom replies; and strip dictionaries, publish/integration credentials, and extended connection state from cross-owner reads/copies
- [ ] 3.6 Add failing tool-approval continuation/tampering tests, merge only approval decisions, preserve trusted display prefixes, allow expected tool-state updates, and project only appended parts once
- [ ] 3.7 Keep user, tool input/output/error (including execution plans), artifact, file, source, historical context, and unknown data payloads unchanged

## 4. Per-rule configuration UI

- [ ] 4.1 Extract pure client helpers and add failing tests for legacy hydration, canonical request shape without shadow fields, controlled drafts, duplicate detection, empty replacement, and limits
- [ ] 4.2 Replace the textarea/global replacement UI with the approved inline row editor, add/delete controls, inline validation, and accessible labels
- [ ] 4.3 Give the editor controlled drafts/validation/acknowledged baseline, preserve rows when disabled, save switch changes against acknowledged rules even while rows are invalid, save valid rule drafts through the subresource, and guard all unsaved route/browser navigation
- [ ] 4.4 Update labels and guidance from sensitive-word filtering to per-word replacement semantics
- [ ] 4.5 Add failing subresource autosave race/cross-tab/navigation tests and implement debounced single-flight saves with captured agent IDs, save-before-leave, failure/conflict retention, stale-completion isolation, explicit discard, and visible reload/retry
- [ ] 4.6 Remove sensitive config from the general configuration autosave payload and verify unrelated settings continue saving while rule drafts are invalid

## 5. Verification and documentation

- [ ] 5.1 Run focused API and client tests, then related full suites, lint, and type checks with Node 22.20+
- [ ] 5.2 Run `openspec validate upgrade-agent-sensitive-word-replacements --strict` and review the final diff for unrelated changes or unresolved placeholders
- [ ] 5.3 Start with `start.sh` and browser-verify legacy load/edit/null-disable, distinct replacements, empty deletion, validation, rapid autosave/reload/navigation, disable/re-enable, reasoning toggle, opening/custom/operator replies, public/square redaction, tool approval continuation, valid visible errors, and live/history parity
- [ ] 5.4 Update OpenSpec task checkboxes immediately after each verified task and document any remaining deployment-only verification
