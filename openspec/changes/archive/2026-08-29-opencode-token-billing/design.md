## Context

`OpencodeChatProvider` streams OpenCode SSE into AI SDK UI Message Stream and persists text/tools/artifacts, but never reads OpenCode token fields. Dify/Coze providers already: (1) collect remote usage, (2) emit `data-usage`, (3) persist `usage` + `userConsumedPower`, (4) deduct via `AgentBillingHandler` using `AgentConfigService.createTypes[<key>].points` with fixed `tokens: 1000` denominator. OpenCode assistant messages expose:

```ts
tokens: { input, output, reasoning, cache: { read, write }, total? }
cost: number // USD — not used for platform billing
```

These appear on `message.updated` (`info` when `role === "assistant"`) and on `message.part.updated` parts with `type === "step-finish"`.

## Goals / Non-Goals

**Goals:**

- Aggregate per-turn OpenCode tokens into `ChatMessageUsage` for UI + DB
- Charge points when console OpenCode create-type billing is enabled with `points > 0`
- Skip charge in debug mode; still surface usage
- Keep client unchanged (existing `MessageUsage` / usage hydration)

**Non-Goals:**

- USD cost → power conversion
- Historical backfill
- Changing createTypes admin UI
- Estimating tokens when OpenCode omits them (show 0 only if truly absent)

## Decisions

### 1. Aggregate from assistant `message.updated` (primary), sum multi-assistant msgs

- **Choice:** During one BuildingAI turn, track latest `tokens` per OpenCode assistant `message.id` from `message.updated`. At turn end, sum across those messages: `input`, `output`, `reasoning`, `cache.read`, `cache.write`.
- **Alternatives:** Only last assistant message (under-counts multi-step); only `step-finish` parts (must handle duplicates carefully). Prefer `message.updated` as authoritative message totals; optionally cross-check `step-finish` if message totals stay zero.
- **Rationale:** OpenCode may emit multiple assistant messages per turn (tool loops); summing message-level totals matches provider accounting.

### 2. Map to platform `ChatMessageUsage`

```
inputTokens  = sum(input) + sum(cache.read)   // align with “prompt includes cache hit” UX if needed
               OR sum(input) only — prefer:
inputTokens  = sum(tokens.input)
outputTokens = sum(tokens.output) + sum(tokens.reasoning)
totalTokens  = inputTokens + outputTokens + sum(cache.read)
               // Prefer OpenCode tokens.total when present per message, else computed sum
outputTokenDetails.textTokens      = sum(output)
outputTokenDetails.reasoningTokens = sum(reasoning)
inputTokenDetails.cacheReadTokens  = sum(cache.read)
inputTokenDetails.cacheWriteTokens = sum(cache.write)
inputTokenDetails.noCacheTokens    = sum(input)
reasoningTokens / cachedInputTokens mirrors details for MessageUsage
raw = { opencode: { perMessage, costSum } }
```

- **Choice:** `totalTokens` for billing = `input + output + reasoning + cache.read` (cache write excluded from billable total unless OpenCode `total` includes it — then prefer reported `total`).
- **Rationale:** Matches MessageUsage fields already rendered; billing uses `totalTokens` like Dify path.

### 3. Billing = same points rule as Dify/Coze

- **Choice:** Inject `AgentBillingHandler` + `AgentConfigService` into `OpencodeChatProvider`. `getBillingRule()` reads `createTypes` key `"opencode"`: enabled + `billingMode === "points"` + `points > 0` → `{ power: points, tokens: 1000 }`.
- **Flow:** Start of turn → `validateUserPower` when `shouldCharge`; end → `deduct` → write `data-usage` including `userConsumedPower` → persist on assistant message.
- **shouldCharge:** `params.isDebug !== true` (same as Dify).
- **Alternatives:** Per-agent model billingRule (OpenCode agents often have no chat model); OpenCode USD cost (currency mismatch).

### 4. Pure mapper + unit tests

- **Choice:** Extract `accumulateOpencodeTokens` / `toChatMessageUsage` in `packages/api/.../utils/opencode-token-usage.ts` with unit tests; provider only calls accumulator on events and finalizes at turn end.
- **Rationale:** TDD-friendly; keeps provider thinner.

### 5. Emit usage even when billing rule is free (points = 0)

- **Choice:** Always emit/persist usage when any token field > 0; `userConsumedPower` may be 0.
- **Rationale:** Fixes the reported “all zeros” UX even before ops sets points.

## Risks / Trade-offs

- **[Risk] OpenCode never sends tokens for some models** → Mitigation: leave 0; log debug once per turn; do not estimate.
- **[Risk] Double-count if both message.updated and step-finish summed** → Mitigation: use only one source for totals (message.updated map); step-finish only as fallback.
- **[Risk] Abort mid-turn leaves partial usage** → Mitigation: still finalize from accumulated map before save (same as Dify best-effort); charge on persisted usage only.
- **[Risk] Default `points: 0` means no deduct after fix** → Mitigation: document ops must set points; UI will show tokens immediately.
- **[Trade-off] Fixed 1000-token denominator** → Consistent with Coze/Dify; not model-accurate pricing.

## Migration Plan

1. Deploy API with usage aggregation + billing; no DB migration.
2. Ops: set console Agent create-type OpenCode `points` if charging desired.
3. Rollback: revert provider; new messages stop accruing usage/charges; no schema change.

## Open Questions

- None blocking: prefer message-level sum; billing formula identical to Dify.
