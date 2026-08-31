## Context

See `proposal.md` for motivation. The iframe endpoint creates or binds an OpenCode session, then the
browser talks directly to OpenCode. Existing durable billing runs only for `AgentOpencodeTurn`,
while the iframe path creates neither local turns nor messages. OpenCode already exposes session
status and full message usage, and `AgentBillingHandler` already implements the platform points
formula.

The account-log association column is limited to 64 characters. An existing partial unique index
covers deductions whose association starts with `opencode-turn:`.

## Goals / Non-Goals

**Goals:**

- Settle iframe turns after the browser disconnects or the API restarts.
- Reuse OpenCode's authoritative message tokens and the existing points rule.
- Avoid historical surprise charges and duplicate native/iframe charges.
- Require no schema migration or client change.

**Non-Goals:**

- Persisting iframe message content into BuildingAI chat history.
- Blocking a direct OpenCode prompt before execution when balance is insufficient.
- Automatically backfilling usage from before the safe boundary.

## Decisions

### 1. Mark iframe sessions at the embed boundary

`AgentChatRecord.metadata.opencodeIframeBilling` is initialized under a row lock immediately before
the embed URL is returned. The state begins with `startedAt` and zero cumulative counters. Repeated
embed polling preserves it.

Only records with this marker are reconciled, preventing native OpenCode conversations from entering
the second billing path. A timestamp is preferred over fetching a remote cursor during the request
because it adds no OpenCode round trip and the iframe cannot prompt before the response returns.

### 2. Run a server-side 30-minute reconciler

A provider in `AiAgentsModule` uses cron `*/30 * * * *`. A PostgreSQL session advisory lock
serializes the whole run across API instances. Each conversation failure is isolated so it cannot
abort the batch.

For each marked record, the reconciler reads remote status first. Busy and retrying sessions are
deferred. Idle sessions return their messages; user messages are ordered by remote creation time,
filtered after `startedAt` or the last settled remote user message, and processed sequentially.

### 3. Settle one remote user turn per database transaction

Assistant messages whose `parentID` equals the user message ID form one billing turn. Their latest
message-level token reports are aggregated with the existing `OpencodeTokenUsageAccumulator`. A
finish or error is required; encountering an incomplete turn stops later processing.

The transaction locks the conversation again, confirms its cursor, checks that no
`AgentOpencodeTurn` owns the remote message, deducts through `AgentBillingHandler`, and atomically
increments conversation totals plus metadata counters and cursor. A deterministic SHA-256-derived
association such as `opencode-turn:if:<40 hex>` fits the database column and is protected by the
existing unique index.

### 4. Resolve billing at reconciliation time

The current `createTypes.opencode` rule is resolved once per batch. Enabled points billing maps to
`{ power: points, tokens: 1000 }`; disabled/free rules still advance the cursor and retain usage.
This matches the existing token billing formula without inventing USD conversion.

## Risks / Trade-offs

- **[Risk] Direct iframe execution cannot preflight balance** → Settlement fails without advancing
  the cursor and retries after balance is available; preventing execution requires a larger OpenCode
  proxy/auth design.
- **[Risk] Account details lag by up to 30 minutes** → This is the user-selected schedule and is
  made explicit operationally.
- **[Risk] Full message history grows over time** → The first version favors the existing simple
  API; the cursor limits local work, and remote pagination can be added if session sizes require it.
- **[Risk] A remote completed message is later mutated** → Settlement only runs while the session is
  idle and uses terminal descendants.
- **[Risk] Metadata counters can diverge from legacy local-message stats** → Conversation columns
  are incremented atomically for iframe turns; the iframe billing subtree remains the audit source
  for this path.

## Migration Plan

1. Deploy the API service and embed-boundary initialization together.
2. Existing sessions acquire a boundary only when the iframe endpoint is called; no earlier usage is
   charged.
3. Observe reconciliation logs and account detail entries for a canary account.
4. Rollback by removing the provider/controller initialization; existing metadata is inert and
   requires no data rollback.
