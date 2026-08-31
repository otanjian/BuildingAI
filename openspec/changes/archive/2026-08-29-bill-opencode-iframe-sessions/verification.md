## Automated verification

Run with Node `v22.22.3` as required by the repository:

- `pnpm --filter @buildingai/api check-types` — passed
- `pnpm --filter @buildingai/api build` — passed
- Focused iframe billing/controller Jest suites — 4 suites, 25 tests passed
- Existing OpenCode token, transaction, controller, and record regression suites — 8 suites, 73
  tests passed
- Full API Jest suite — 80 suites passed, 576 tests passed; 3 suites / 7 tests skipped by their
  existing configuration
- Focused API ESLint — passed
- `openspec validate bill-opencode-iframe-sessions` — passed before implementation; rerun after task
  completion

No real reconciliation run was invoked during verification, so tests did not deduct points from Rock
or any other account.

## Safe rollout and manual canary

1. Deploy/restart the API with the new service.
2. Open one existing OpenCode iframe conversation. Confirm its
   `ai_agent_chat_record.metadata.opencodeIframeBilling.startedAt` is initialized and its existing
   token totals remain unchanged.
3. Send one small new prompt and wait until the OpenCode session is idle.
4. After the next `:00` or `:30` Asia/Shanghai reconciliation, confirm:
    - one `account_log` deduction whose association starts with `opencode-turn:if:`;
    - the amount equals `ceil(totalTokens / 1000 * opencodePoints)`;
    - conversation `total_tokens`, `consumed_power`, and the metadata cursor advanced once;
    - running reconciliation again creates no second deduction.
5. Confirm an OpenCode session that was not opened after deployment has no iframe billing marker and
   is not back-charged.

Rollback only requires removing/disabling the service and embed initializer; the metadata remains
inert and no schema rollback is required.
