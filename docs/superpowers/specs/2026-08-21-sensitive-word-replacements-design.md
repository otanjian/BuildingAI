# Sensitive-word replacement upgrade design

## Outcome

Upgrade the per-agent output control from a list of words sharing one replacement to an ordered list of explicit word-to-replacement mappings. Keep the existing JSON column and provider integration points, while fixing stream part leakage, configuration loss on disable, invalid nested values, empty replacement handling, mixed-version safety, assistant display bypasses, approval-continuation persistence, autosave races, and reasoning live/history inconsistency.

The canonical product scope and detailed technical decisions are in:

- `openspec/changes/upgrade-agent-sensitive-word-replacements/proposal.md`
- `openspec/changes/upgrade-agent-sensitive-word-replacements/specs/agent-sensitive-word-replacement/spec.md`
- `openspec/changes/upgrade-agent-sensitive-word-replacements/design.md`

## Approved interaction

Use an inline controlled row editor. Each row contains a sensitive word, its replacement value, and a delete action. Administrators can add multiple rules, use an empty replacement to remove matched source text, and disable replacement without losing rules. Blank words and ASCII case-insensitive duplicates remain page-owned drafts with inline errors; sensitive config is omitted while invalid, unrelated fields may save, and navigation is guarded until the draft is fixed or discarded.

## Approved architecture

- Extend the existing config with `rules: Array<{ word, replacement }>` and retain deprecated legacy fields for compatibility.
- Put config limits, validation, legacy normalization, and comparison in one isomorphic utility used by both API and client; keep compatibility-shadow serialization server-owned.
- Add an `expectedRevision`-guarded `PATCH /ai-agents/:id/sensitive-word-config` subresource with row locking; stored revisions remain server-managed and general agent autosave omits the field.
- Treat `rules` as authoritative when present; otherwise map the legacy word list to its historical shared replacement semantics, including empty legacy values falling back to `***`.
- Have the server regenerate and dual-write a legacy `words` plus `replacement: "***"` shadow so older instances fail closed during rolling deploys and rollbacks.
- Reject client-supplied shadow fields on the canonical endpoint; clients send only rules, switches, and expected revision.
- Validate nested values and bounded sizes at the API boundary.
- Use authoritative rules only when the entire set is valid; otherwise atomically fall back to the fail-closed legacy shadow, or reject an enabled turn if no safe representation exists.
- Interpret an older client's null update as disable-with-preservation and its immediate empty/default re-enable as restoring those rules.
- Preserve authoritative rules for old-client switch changes, but reject old-client word/global-value edits once canonical rules exist because they are indistinguishable from stale-tab autosaves.
- Accept an older page's exact canonical echo as read-only mapping state and ignore stale echoes, so unrelated legacy autosaves remain usable without exposing a second rule-write path.
- Store a rule-specific replacement on each automaton terminal and reconstruct from the original source once, preserving longest-first, non-overlapping, non-cascading behavior.
- Build fail links with cursor-based BFS so maximum-size dictionaries do not incur `Array.shift()` compaction costs.
- Replace fixed max-length holdback with incremental trie-prefix-aware buffering so unrelated text streams promptly without weakening longest-match guarantees.
- Apply one outbound TransformStream before all five HTTP stream pipes; maintain state per part type/ID, flush on step boundaries, synthesize missing end events at final boundaries, and remove provider-specific live filtering.
- Normalize outer failures to standard HTTP errors before headers or schema-valid projected AI SDK `errorText` chunks after headers, so clients always reach a terminal state.
- Use the same normalized rules for live output and persisted parts; honor the reasoning flag in both.
- Compile one immutable policy immediately after agent authorization and before conversation, billing, persistence, or provider side effects.
- Apply an explicit allowlist to opening/custom/annotation/operator replies, suggestions, and top-level errors; structurally project rich text, keep execution plans and other tool payloads unchanged, and never recurse through arbitrary data.
- Accept only approval decisions from the client, preserve the server's trusted persisted prefix, and filter only verified appended continuation content once.
- Use a dedicated debounced single-flight sensitive-config queue with captured agent IDs; await valid saves before navigation, retain failures, guard browser unload, and isolate stale completions.
- Keep sensitive config out of general autosave so unrelated settings cannot overwrite/conflict with rules and can save while rows are invalid.
- Mark the sensitive JSON column `update: false` and reserve its locked parameterized update for the dedicated service, so all current and future ordinary Agent saves ignore stale rule JSON automatically.
- Keep the dictionary out of published detail, square copies, and diagnostics; deploy all API nodes before the new UI.
- Omit quick-command configuration entirely from published detail and project opening/custom replies into square copies before omitting the source dictionary.
- Make generic detail owner-only and replace full-entity published/square serialization with minimal public DTOs, projecting assistant-authored opening statements while excluding dictionaries, internal prompts, publish tokens, enterprise-chat secrets, and integration credentials.
- Strip third-party credentials/extended connection state from square copies, preserving only the provider discriminator and requiring reconnection by the new owner.
- During an API rollback, keep the new UI or freeze configuration writes; do not run old null-on-disable writes against canonical configs.
- Implement through failing tests first, then verify types, API tests, client helper tests, builds, OpenSpec validation, and browser behavior.

## Verified root cause

The existing 21 sensitive-word tests pass, but a reproduction using `reasoning-start → reasoning-delta → reasoning-end → text-start → text-delta → text-end` moves the final held-back reasoning character into a later `text-delta`. One shared stream filter is crossing semantic parts. State must be isolated by both type and AI SDK part ID; channel-only separation is insufficient for multi-step turns.
