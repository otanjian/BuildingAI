## Local verification evidence

Date: 2026-08-21
Runtime: Node 22.22.3, PostgreSQL, OpenCode 1.17.13
Services: API, web, and OpenCode launched from this worktree through `start.sh`.

### Automated scenarios

- API scenarios cover first and duplicate acceptance, conflicting IDs, same-conversation exclusion, independent A/B conversations, bounded status failures/timeouts, and recovery from `accepted`, `running`, and `committing` after process loss.
- PostgreSQL integration scenarios cover `SKIP LOCKED` exclusion/takeover, conversation advisory-lock serialization, stale-worker fencing, exactly one terminal projection, installed-version migration restart, and idempotent rollback.
- Shared client scenarios cover lost HTTP 202 recovery, same-ID retry, single-flight bounded polling, indicator replacement, independent A/B conversations, exact current/old/repeated Stop, and visible billing failure.
- Detail-chat and site-chat scenarios use the same durable turn store and omit edit, regenerate, and unverifiable branch actions for durable OpenCode conversations.

### `start.sh` fault injection and real turns

- A cold `start.sh` launch applied versions 26.1.2 through 26.1.5, created the durable turn schema, and made API, web, and OpenCode health endpoints available.
- A real internal turn returned `accepted`; the API process was restarted immediately while web and OpenCode stayed running. The same conversation and turn IDs recovered and reached `completed` with one persisted user message and one persisted assistant message.
- Fault injection exposed two implementation defects before rollout expansion: PostgreSQL rejected `FOR UPDATE` across a nullable relation join, and terminal evidence observed in `running` skipped the `committing` boundary. Regression tests were added first; the fixes now lock only the turn table and always persist `running -> committing` before the terminal transaction.
- Final independent review exposed two additional recovery windows before completion: a process could die after persisting `running` but before/around `prompt_async`, and deterministic runtime/session/snapshot failures could retry forever. Recovered `running` turns now pass through stable-message correlation before observation, and deterministic recovery errors atomically create one visible zero-usage `failed` projection. Transient transport/deadline and lease-loss errors remain retryable.
- The follow-up review also found that missing snapshot data could block its own recovery failure and that partial structural validation could forward malformed prompt/model/artifact data. Recovery failures now bypass billing without requiring a usable snapshot, while a shared pure validator reconstructs the exact accepted snapshot shape and rejects missing, malformed, non-canonical, or extra fields before any remote operation.
- The final narrow review questioned the remaining ambiguous remote edges. The deployed OpenCode 1.17.13 server was probed by submitting the same asynchronous prompt twice with one stable `messageID`; both calls returned 204, and the session contained exactly one user message plus one assistant descendant. Session creation was also probed with a turn receipt in metadata and recovered exactly through the session-list contract. Durable first-session setup now searches by the receipt before create, reuses the oldest exact match, removes duplicate unmapped matches, and revalidates the lease/mapping before cleanup and persistence. Probe sessions were deleted afterward.
- The completed real turn retained one exact remote user-message correlation, one assistant linked to the local input, one namespaced deduction, correct conversation statistics, and cleared all lease/recovery snapshots.
- Replaying the identical command returned the same terminal turn as a duplicate. Repeated terminal Stop calls stayed terminal without extra effects.
- A real pre-dispatch Stop called twice produced one `cancelled` assistant, no remote start time, and no deduction.
- A real fault injection accepted a turn, stopped the API, changed the canary runtime fingerprint, and restarted the API. The same turn committed `failed` with `OPENCODE_RUNTIME_CONFIG_CHANGED`, one visible assistant, zero deductions, and the original runtime configuration was restored automatically.
- After the final build, the `start.sh` API was restarted and a new anonymous canary turn completed with `FINAL_RECEIPT_SMOKE_OK`. Exactly one receipt-matched OpenCode session was listed, it equaled the persisted conversation mapping, and the local turn had one linked assistant plus one namespaced deduction.
- Deleting an active conversation returned HTTP 409; exact turn-scoped Stop then settled it. Deleting a terminal test conversation returned HTTP 200 as a soft delete and retained the terminal turn audit row.
- Archiving hid the conversation from the default list while direct detail remained readable and projected the terminal legacy status; unarchive restored it.
- The durable browser path opened no OpenCode event-stream or direct port-4096 resource. It used BuildingAI acceptance/status/history endpoints only.

### Browser surfaces

- The authenticated detail chat rendered the real persisted user/assistant pair after restart with no stale activity indicator and no edit, retry, regenerate, or branch controls.
- The published site chat created a real conversation, navigated to its stable URL, showed one activity indicator, and after refresh rendered the committed reply with the indicator removed.
- Switching from the completed published conversation to a new conversation and back restored the same persisted history without a provisional conversation ID.

### Invariants and rollout decision

The read-only invariant audit returned:

```text
terminalAssistantViolations = 0
billedCompletedWithoutAssistant = 0
duplicateDeductions = 0
healthy = true
```

Rollout remains limited to the internal **Bowi AI developer assistant**. The other OpenCode agents remain on their existing path until this canary has accumulated more normal usage. Do not expand the flag automatically.

### Verification command boundary

- `openspec validate opencode-turn-consistency --strict` passes. Repository-wide strict validation reaches 34 passing items and two unrelated existing failures: `ehcs-ai-platform-chat` has a requirement without a scenario, and `enterprise-dashboard-themes` has no OpenSpec delta section.
- The final fresh API run passes 48 suites and 402 tests, including six PostgreSQL migration/concurrency scenarios. The OpenCode client run passes seven files and 30 tests.
- API and client lint pass. The client currently reports ten existing formatting/import-order warnings and zero errors.
- API typecheck and direct client `tsc --noEmit` pass. Turbo typecheck passes for the other 36 workspace packages; the full unfiltered command is blocked only by the unrelated `ehcs-ai` extension's existing classic `moduleResolution` configuration (24 packages finish before Turbo stops at that package).
- API and web production builds pass under Node 22.22.3. Generated `public/web` release output is verification-only and is not part of this change.
- The narrow final re-review of the prompt-idempotency, session-receipt recovery, and snapshot-independent cancellation fixes returned no Critical or Important findings. The simpler alternative assessment retained the three existing primitives (stable prompt ID, session receipt, atomic terminal transaction) and rejected adding an outbox, remote-session ledger, or extra lifecycle state.

Rollback procedure:

1. Stop enabling new durable acceptance for the canary by setting its agent-scoped `durableTurnsEnabled` flag to false.
2. Let any existing active durable turn reach a terminal state, or use its exact turn-scoped Stop endpoint; do not route the same active conversation through legacy acceptance.
3. Keep the durable schema, messages, account logs, and turn rows. The compatibility projection continues to serve legacy clients; rollback must not drop or rewrite audit data.
