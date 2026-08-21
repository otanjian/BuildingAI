## Context

See `proposal.md` for motivation and `specs/agent-sensitive-word-replacement/spec.md` for observable behavior.

The current JSON configuration is `{ enabled, words, replacement, applyToReasoning }`. Its Aho-Corasick engine stores only match length and uses one global replacement. All providers already share that engine for live output and batch persistence, so the upgrade can remain localized.

Investigation and reverse review found these defects adjacent to the requested change:

1. Turning the UI switch off writes `null`, permanently discarding rules and the reasoning preference.
2. `replacement || "***"` in both UI and engine makes intentional empty-string removal impossible.
3. Agent DTOs apply only `IsObject` to this config, so malformed nested values reach the JSON column.
4. The stream adapter shares one holdback state between reasoning and answer text and flushes only on `text-end`. A baseline reproduction emitted the final reasoning character as a `text-delta` after `reasoning-end` even though all 21 existing unit tests passed.
5. OpenCode persistence batch-filters reasoning regardless of `applyToReasoning`, so live and history can disagree when reasoning replacement is disabled.
6. New-only `rules` JSON would be ignored by an older instance during a rolling deployment or rollback, disabling filtering completely.
7. One state per channel still allows separate text parts with different AI SDK IDs to contaminate each other, and missing `*-end` events can place held-back text after terminal events.
8. Quick-command replies, annotation replies, operator replies, follow-up suggestions, and top-level errors bypass the current replacement path.
9. Tool-approval continuation persists the AI SDK's rebuilt raw assistant message instead of the filtered live projection. Batch-filtering the entire rebuilt message would also reprocess already replaced legacy parts and violate non-cascading behavior.
10. The page autosaves the full form concurrently and refetches after each third-party-agent response, so an older response can overwrite a newer local rule edit.
11. API-side `repository.save` calls write previously loaded full Agent entities after asynchronous work. A delayed general update or Coze/Dify synchronization can therefore restore a stale sensitive-word JSON value even when the new client omits that field.
12. The generic agent detail method returns a full published Agent to non-owners, and the public square list serializes full entities. Both bypass the published-detail redaction and can disclose the dictionary, third-party API keys, publish access tokens, and enterprise-chat credentials. Square copy also duplicates `thirdPartyIntegration` credentials into another user's agent.
13. The direct-agent outer error fallback emits `{ type: "error", error }`, but AI SDK 5 requires `{ type: "error", errorText }`; clients can ignore the malformed event and remain without a visible completion/error state.

## Goals / Non-Goals

**Goals:**

- Add independent replacement values without a schema migration or provider-specific implementations.
- Make legacy and new configurations deterministic and reversible.
- Make validation, batch replacement, streaming replacement, and UI editing independently testable.
- Correct part isolation and live/history consistency for every existing provider and assistant-generated display path.

**Non-Goals:**

- Change literal matching semantics beyond associating each match with its replacement.
- Introduce a database table, global dictionary, regex rules, fuzzy matching, or historical backfill.
- Filter user, tool, or artifact content.

## Decisions

### D1. Add rule mappings to the existing JSON value

The shared type gains `SensitiveWordReplacementRule { word, replacement }`, `SensitiveWordConfig.rules`, and a server-managed integer `revision`. Legacy `words` and `replacement` remain optional and deprecated for reads and older clients.

Normalization uses this precedence:

1. If `rules` is an array, it is authoritative, including an empty array.
2. Otherwise, map each legacy `words` entry to the legacy `replacement`; both absent and empty legacy values map to `***` to preserve current behavior.
3. New subresource requests send only authoritative `rules`, switches, and `expectedRevision`. After validating that concurrency precondition, the server persists a server-managed `revision` plus a generated compatibility shadow: `words` contains every normalized rule word and `replacement` is always `***`. New instances use `rules`; older instances fail closed by masking every word.

An empty replacement remains empty only in the new rule format. Outer whitespace is trimmed from words, while replacement values are preserved byte-for-byte. Disabled configuration is stored with `enabled: false` instead of being replaced by `null`.

Alternatives rejected: parallel word/replacement arrays can silently drift by index; a new JSON version wrapper adds migration branches without improving behavior; a rule table is disproportionate for small per-agent dictionaries.

### D2. Share canonical config semantics across client and server

An isomorphic pure module under `@buildingai/utils` owns constants, ASCII case-folding, validation, legacy normalization, and canonical comparison. Both API and client consume this module, avoiding two independently evolving definitions. It returns structured validation errors rather than throwing for editable drafts. The server alone invokes the storage serializer that derives deprecated shadow fields; the canonical client DTO rejects those fields so they can never be trusted as input.

Dedicated nested DTO classes still enforce transport shape before service logic. Because `whitelist` plus `forbidNonWhitelisted` is enabled globally, each endpoint explicitly declares only its canonical request or compatibility-echo properties. A configuration-level validator calls the shared semantics to reject blank normalized words and ASCII case-insensitive duplicates. Limits are 500 rules and 128 Unicode code points for both word and replacement, measured in code points rather than UTF-16 code units. Bounding replacement length also limits pathological output expansion.

The UI uses the same limits and duplicate key semantics for immediate row feedback. API validation remains authoritative. Runtime canonical normalization is fail-closed: authoritative `rules` are used only when the complete set is valid. If they are corrupt, runtime logs a redacted configuration warning (agent ID and reason code only; never words or replacements) and falls back only to a usable compatibility shadow whose replacement marker is exactly `***`; it never executes an arbitrary canonical subset or an untrusted shared replacement. If an explicitly enabled canonical configuration has neither a safe canonical set nor that mask shadow, the turn is rejected before generation with a generic configuration error. Only an absent, valid empty, or explicitly disabled configuration is passthrough.

Stored pre-upgrade legacy data is handled more leniently to avoid breaking existing agents: trim words, skip blanks and over-limit entries, case-fold/dedupe with first occurrence winning, and cap at the first 500 valid unique words, all using the historical shared replacement semantics. Redacted reason codes identify cleanup opportunities. This leniency is read-only; any new legacy write still passes strict DTO/service validation.

A new canonical configuration receives server revision 1. Legacy, null, and absent configurations remain in legacy form and expose an upgrade baseline of revision 0; their first canonical request must present `expectedRevision: 0` and is stored as revision 1. Create cannot select a revision. Later canonical requests must present the stored revision as `expectedRevision`. Every semantic mutation of an already canonical policy, including an older client's compatible switch change, increments the stored revision; a canonical no-op returns the current representation without incrementing it. Strict legacy writes before canonical upgrade retain legacy storage and revision 0 so an older client can keep editing them.

New clients write only through `PATCH /ai-agents/:id/sensitive-word-config`. The endpoint runs a short database transaction that loads the agent row with a `pessimistic_write` lock, checks ownership and revision, canonicalizes the config, updates only the sensitive JSON column, and returns the stored config. Agent creation remains null because the create UI has no rule editor; the first subresource save initializes revision 1. The general agent PATCH removes `sensitiveWordConfig` from new payloads, so unrelated form saves cannot overwrite or conflict with mappings. This makes concurrency atomic with far less risk than refactoring full-page save transactions.

Omitting the field at the HTTP boundary is not enough because TypeORM can persist stale properties from a previously loaded full entity. The entity column is therefore declared with `update: false`: inserts may still initialize legacy/null data, but every ordinary metadata-aware `save` or `update` ignores this column automatically. The locked sensitive-config service is the only update writer and uses a parameterized SQL update whose table/column paths are obtained and escaped from TypeORM metadata; the legacy compatibility branch delegates to it. Focused tests verify the metadata guard, the dedicated writer, and a race that pauses a non-sensitive full-entity save, commits a newer sensitive revision, then proves the delayed save cannot restore the old JSON. This central guard is smaller and safer than auditing or refactoring every current and future Agent write path, adding a new table, or introducing a global entity version.

For legacy compatibility, a client sending `sensitiveWordConfig: null` against an agent that already has rules means “disable while preserving current rules”. If a concrete legacy payload's normalized words and shared `***` value still equal the stored compatibility shadow, it updates only `enabled` and `applyToReasoning` and preserves authoritative rules. An enabled empty/default legacy payload also re-enables preserved rules when the stored authoritative configuration is currently disabled; this covers the old direct page's null local state immediately after disabling. Any other legacy word/replacement change against authoritative rules is rejected with an upgrade-required conflict because the server cannot distinguish an intentional edit from a stale old-tab autosave. Concrete legacy payloads remain editable only until the agent has been upgraded to canonical rules. A newly created agent may still use `null` to mean no configuration.

An older page also preserves unknown runtime properties when it hydrates a returned object, so an unrelated autosave can echo the complete canonical object. The general DTO accepts this compatibility-echo shape, but service semantics are read-only for mappings: when echoed revision, rules, and server shadow exactly match storage, only switch differences may be applied through the locked writer; when the revision is stale, the entire sensitive field is ignored while unrelated fields still save; any same-revision rule/shadow mutation is rejected. Thus old pages remain usable without creating a second canonical write endpoint.

### D3. Carry the selected rule through the matcher

Each automaton terminal stores match length and replacement. Match candidates therefore carry `{ start, end, replacement }`. Sorting remains leftmost, then longest. Matching duplicates cannot reach the engine because canonical validation rejects them and lenient legacy normalization keeps the first occurrence. Reconstruction slices only the original source once and inserts selected replacements, so replacement output is never fed back into matching.

This keeps O(source length + matches) scanning and preserves the existing literal, code-point-safe behavior. Sequential `replaceAll` is rejected because it is order-dependent and cascades; a generated regex is rejected because large dictionaries and cross-chunk state remain harder to control.

Trie fail-link construction uses an index cursor over the BFS array instead of `Array.shift()`, avoiding repeated array compaction for the allowed worst-case dictionary.

Streaming advances the automaton incrementally and retains only the minimal suffix that can still participate in a future match, plus any selected match that cannot yet be emitted without crossing that suffix. It does not always hold `maxWordLen - 1` code points. A completed word with a longer same-start continuation remains unresolved until that continuation succeeds or fails; when no suffix can extend to a configured word, all determinable output is released immediately. This preserves batch equivalence and longest-match semantics while avoiding visible 127-character latency merely because one long rule exists.

### D4. Filter once at the HTTP stream boundary

Every agent path already produces a complete AI SDK `UIMessageChunk` stream immediately before `pipeUIMessageStreamToResponse`. A single outbound TransformStream is inserted at each of those five boundaries (direct normal, direct custom reply, OpenCode, Coze, and Dify). Existing provider writer wrappers and the direct path's inner merge transform are removed from production wiring, eliminating path-specific behavior and preventing double replacement.

The outbound transform stores text/reasoning filtering states in a map keyed by `(part type, part id)`. Each state flushes immediately before its matching `text-end` or `reasoning-end` and is then deleted. AI SDK source confirms message/step events are semantic boundaries and valid producers close parts first, so any open state at a new top-level `start`, `start-step`, `finish-step`, `finish`, `abort`, top-level `error`, or EOF is flushed and synthetically closed in deterministic creation order before the boundary. A delta with a valid ID but no prior start is recovered by emitting a synthetic matching start before filtering it; a delta without a usable ID is suppressed and terminates the stream with a generic safe error rather than leaking raw text. A repeated start for an open key first flushes and synthetically closes the old logical part. Unknown or duplicate end events are suppressed, while an explicit later start may reopen a synthetically closed ID. Delayed deltas use the part's latest available provider metadata. When reasoning replacement is disabled, reasoning deltas bypass text filtering but lightweight lifecycle state still tracks their IDs so malformed streams can be closed safely. The map permits at most 32 simultaneously open text/reasoning parts; exceeding that limit flushes and closes existing parts, emits one generic safe error, and enters the terminal state. After `finish`, `abort`, or top-level `error`, the projector discards any late source chunks.

This directly removes the reproduced cross-part leak, catches generated data and `onError` chunks that writer wrappers miss, and prevents characters from different semantic parts forming a false match. OpenCode background persistence is unaffected: disconnected clients stop consuming the outbound projection while its existing background turn continues and saves through the batch projection.

### D5. Apply one normalized allowlist policy to all assistant display surfaces

Immediately after loading and authorizing the agent, the top-level chat service validates and compiles one immutable policy snapshot before creating a conversation, saving a user message, validating billing, or calling an external provider. Invalid enabled configuration therefore fails without chat/provider side effects. The snapshot is passed to custom-reply handling and each provider rather than rebuilt downstream.

Live outbound streams and persisted parts use projections built from that same snapshot. A shared batch projector filters only allowlisted assistant fields before each save. OpenCode reasoning persistence is conditional on `applyToReasoning`, matching the direct path. Configuration edits during a running turn affect the next turn, never one side of the current live/history pair.

Replacement covers only explicitly named user-visible reply fields:

- `text` and optionally `reasoning` parts;
- quick-command and annotation custom replies in the outbound stream and shared batch persistence projection;
- every string in `data-follow-up-suggestions`;
- operator reply text before it is stored and synchronized;
- top-level user-visible stream error strings;
- opening-statement text before it is rendered on owner preview or emitted by published detail.

Tool inputs/outputs (including execution-plan output) and tool-specific errors, files, sources, artifacts, and user messages remain untouched. Unknown data parts pass through. A producer that adds newly generated assistant text to `data-conversation-context` builds that entry from the already batch-projected assistant message; the outbound transform does not recursively reprocess historical context. This avoids structural corruption, cascading older output, and secret-list disclosure through arbitrary data traversal.

Opening statements and custom command replies may be markdown or Plate/Slate JSON. Plain/markdown values use the same source-text replacement semantics as live replies. For valid JSON, a small structural projector recursively updates only explicit string `text` leaves and reserializes valid JSON; it never string-replaces serialized JSON or walks arbitrary fields. Owner configuration detail retains raw editable values; owner/public chat consume the projected opening statement from the published-detail projection. Opening questions remain user-input templates and are deliberately not rewritten.

Owner detail becomes owner-only; published detail uses a separate published-agent loader and an explicit allowlist DTO containing only fields consumed by the public chat. It exposes a top-level `allowCopy` boolean but never serializes raw `publishConfig`, `thirdPartyIntegration`, internal prompts/routing, quick commands, or the sensitive policy. It projects the opening statement; quick-command matching and reply content remain server-side. The public square list maps to a separate minimal card DTO instead of spreading Agent entities.

Square-copy creation omits the dictionary and all source credentials. For a third-party agent it preserves only the provider discriminator, leaves credentials/extended connection config empty, and marks the copy as requiring reconnection before chat. It writes the projected opening statement and projected custom command replies into the copy, so the copied agent cannot expose source text after losing the source policy. If an enabled source policy cannot be compiled safely, published detail/copy fails closed with a generic configuration error. Tests make these boundaries explicit because dictionaries, configured replies, and integration settings may contain secrets.

Errors generated inside a UI message stream pass through the outbound projector. Every streamed error is a schema-valid AI SDK 5 chunk using `errorText`, followed by stream termination; tool error chunks remain untouched. Errors caught before streaming begins return the existing standard HTTP error envelope rather than pretending to be SSE. If headers are already committed outside the normal UI stream, a helper emits one valid projected error chunk and closes the response. It uses the agent policy if one has been loaded and a generic user-safe message otherwise, while detailed diagnostics remain server-side.

### D6. Preserve exactly-once behavior during tool approval continuation

Before starting an approval continuation, load the persisted assistant message as the trusted filtered prefix. The client-provided assistant body is not trusted: only approval IDs and decisions are merged into matching persisted tool parts. The AI SDK continuation then uses the same message ID. Persistence keeps existing text/reasoning/data parts byte-for-byte, accepts expected state/output transitions for existing tool parts, and batch-projects only newly appended assistant display parts. Existing prefix text is never batch-filtered again, preventing replacement values from cascading under later rules. A dedicated integration helper checks prefix type/identity invariants and rejects safely if the continuation mutates trusted display text or changes the structure unexpectedly.

### D7. Use an inline row editor with draft validation

The configuration card is renamed to “敏感词替换”. Each row contains word, replacement, and delete controls, plus “添加替换规则”. Existing legacy settings are expanded into rows on load. Empty replacement is explained as deletion.

The configuration page owns the complete row draft, its last acknowledged canonical snapshot/revision, and structured validation errors; the row component is controlled. The dedicated payload builder sends only valid `rules`, switches, and `expectedRevision` to the subresource. Invalid rows show inline messages and send no rule mutation, so unrelated valid settings can still autosave without serializing destructive intermediate rules. Switch changes are independent: even while row drafts are invalid, the client updates `enabled` or `applyToReasoning` against the last acknowledged valid rules/revision, then advances the draft's revision without replacing its rows. Disabling therefore takes effect immediately while preserving both stored rules and the invalid local draft. Attempting route or browser navigation with an unsaved row draft is guarded rather than silently dropping it.

### D8. Isolate sensitive configuration autosave

The sensitive-word editor owns a dedicated debounced, single-flight save queue targeting the subresource endpoint. It tracks its last acknowledged canonical snapshot/revision and sends only valid dirty drafts. A successful response advances the acknowledged snapshot/revision without replacing edits made while the request was in flight. A stale-revision response preserves the draft and exposes reload/retry. The main configuration autosave always omits `sensitiveWordConfig`, so invalid drafts and cross-tab policy conflicts do not affect unrelated settings.

Every sensitive save captures its agent ID. Route navigation with a valid dirty or in-flight draft waits for its save to succeed before leaving; on conflict or failure it remains on the current agent and offers retry or explicit discard. Invalid drafts offer continue-editing or explicit discard. Browser unload uses the native unsaved-change guard because it cannot await a request. If navigation proceeds after a completed save or explicit discard, any late completion still carries the old agent ID and cannot hydrate the new editor.

The general PATCH DTO accepts only the old `{ enabled, words, replacement, applyToReasoning } | null` shape plus a compatibility echo of the complete stored canonical object. Its narrowly scoped handler preserves null-disable, unchanged-shadow switch toggles, and same-revision canonical-echo switch toggles; stale canonical echoes are ignored so unrelated updates proceed; edited legacy mappings or same-revision canonical mappings return upgrade-required conflict. Canonical rule mutation is accepted only by the subresource and never by create/general update endpoints.

### D9. Prove behavior with layered TDD

Pure normalization/validation tests cover legacy precedence, legacy empty values, server-generated compatibility shadows, old-page canonical echoes, mixed versions, malformed data, duplicates, and code-point limits. Engine tests cover distinct values, overlap, non-cascade, Unicode, arbitrary chunk splits, and adaptive release. Adapter tests reproduce cross-channel and same-channel/different-ID leakage, deltas without starts, unusable IDs, missing/duplicate ends, terminal ordering, and schema-valid projected errors. Service tests cover custom and operator replies, opening content, suggestions, pre-/post-header errors, OpenCode reasoning, approval continuation exactly-once persistence, owner/public/square/copy projections, and delayed non-sensitive Agent writes. UI tests cover legacy hydration, canonical request shape, controlled invalid drafts, general-field omission, out-of-order responses, save-before-leave, failure retention, and guarded agent/browser navigation; browser verification covers editing, autosave, reload, disable/re-enable, opening/custom replies, reasoning, and live/history parity.

## Risks / Trade-offs

- [Legacy malformed JSON behaves unpredictably] → Normalize defensively at runtime and upgrade only on successful save.
- [Corrupt canonical rules partially disable protection] → Reject new writes and fall back atomically to the validated mask shadow rather than keeping a valid subset.
- [All stored rule representations are corrupt] → Reject enabled turns with a generic safe error instead of passing unfiltered model output.
- [Long words delay live output] → Enforce the 128-code-point limit so holdback remains bounded.
- [A single long rule delays all ordinary output] → Use automaton-prefix-aware adaptive holdback instead of a fixed maximum-length tail.
- [Replacement expansion increases output size] → Cap each replacement at 128 code points and rules at 500.
- [Client/server validation drifts] → Keep API authoritative and cover matching rules with tests on both sides.
- [A stream ends without a part end event] → Flush and synthetically close each remaining part at the next semantic boundary using its own type and ID.
- [Rollback reads new JSON] → Keep executable legacy shadows, deploy API first, and freeze configuration writes during a simultaneous old-API/old-UI rollback.
- [Older instances ignore rule mappings] → Dual-write a `***` compatibility shadow so old code masks more aggressively instead of leaking source text.
- [Approval continuation re-filters trusted history] → Preserve the persisted prefix and filter only verified appended parts.
- [Refetch races with local edits] → Isolate a single-flight subresource queue and never hydrate a stale response over a newer draft.
- [Two tabs overwrite mappings] → Check/increment the subresource revision under a database row lock; general saves omit the field entirely.
- [A delayed full-entity Agent save restores stale JSON] → Mark the entity column `update: false`, permit updates only through the locked parameterized writer, and race-test asynchronous synchronization paths.
- [Navigation hides a failed background save] → Await valid dirty/in-flight saves before route navigation and block on failure unless the administrator explicitly discards the draft.
- [Diagnostics disclose the sensitive dictionary] → Log only agent IDs and fixed validation reason codes.
- [A generic public read/copy exposes secrets] → Make owner detail owner-only, map published/square reads through explicit allowlist DTOs, and strip credentials/connection state from square copies.
- [Malformed outer errors leave the client hanging] → Emit only schema-valid AI SDK `errorText` chunks after headers, use normal HTTP errors before headers, and test client terminal behavior.
- [Malformed streams grow unbounded part state] → Cap simultaneously open text/reasoning parts and terminate safely on overflow.

## Migration Plan

1. Deploy shared types, DTO validation, normalization, engine, and adapter changes together.
2. Finish upgrading and health-checking every API instance before deploying the new UI. This ensures cached old clients that send null-on-disable reach a preserving backend.
3. Deploy the row editor; existing agents load through legacy normalization and continue producing identical output until edited.
4. A successful save writes authoritative `rules` plus the regenerated `***` legacy shadow; no bulk database migration is required.
5. During a rolling UI deploy, older clients can toggle an upgraded configuration but must use the new editor to change its mappings; older binaries in an emergency rollback mask every shadow word.
6. Verify direct, Coze, Dify, and OpenCode through shared engine/adapter tests plus custom-output, approval-continuation, security-boundary, and persistence coverage.
7. For an API rollback, keep the new UI or freeze agent-configuration writes; it sends object configs that old code can execute through the shadow. Rolling the UI back while the upgraded API remains is also safe. A simultaneous full rollback must keep configuration writes frozen until the upgraded API returns, because the old null-on-disable service can destroy canonical rules.
