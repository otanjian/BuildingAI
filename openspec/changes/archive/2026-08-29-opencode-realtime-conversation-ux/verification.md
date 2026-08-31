# Verification and Rollout Record

## Automated verification

- OpenSpec validation passes for `opencode-turn-consistency` and `opencode-realtime-conversation-ux`.
- API: 59 suites and 465 tests passed; 3 suites / 7 environment-gated tests skipped.
- Client: 21 files and 96 tests passed.
- Database and API typecheck, lint, and production builds pass.
- Client lint reports 0 errors and 10 pre-existing formatting warnings; the production Vite build passes in 56.85 seconds.
- Strict client TypeScript was executed. Files in this change are clean; the repository-wide command remains blocked by unrelated existing errors in shared UI/editor/configuration modules.
- The architectural regression suite verifies that durable clients do not open raw OpenCode event or session-message paths and do not rekey provisional `new-*` chat identities.
- A PostgreSQL integration test replays projection migration `up`, duplicate `up`, `down`, and `up`, and verifies that a terminal row cannot retain a live projection.
- A real installed 26.1.5 database was restarted through `start.sh`. Startup reconciled the newly added same-version migration by migration-history name, recorded it once, and added `live_projection`, `projection_version`, and `projection_updated_at` to `ai_agent_opencode_turn`.

## Local browser observations

- The durable internal agent immediately resolves `/chat` to a final UUID conversation route and focuses the composer without creating a database conversation.
- Persisted history remains authoritative after navigation and refresh.
- The final live-turn send, projection, interruption, and terminal-replacement timing drill requires action-time approval because it submits an actual message to the internal agent. Record those timings here after approval before checking task 9.4.

## Rollout and rollback

1. Deploy the additive database migration and API readers/writers before enabling the new client on additional internal agents.
2. Monitor projection latency/write rate, upstream connection and reconnect counts, truncation, polling fallback, terminal rows retaining projections, and client cache hit/miss counters.
3. To roll back, deploy the prior polling-only client first. Current clients already fall back to durable status polling when projection SSE is unavailable.
4. Then roll back the projection SSE/projector API code. Leave the additive projection columns installed; they are nullable and do not own execution, terminal persistence, or billing.
5. Do not run the migration `down` while turns are active. Schema removal is optional and should happen only after all active turns are terminal and all projection readers/writers are removed.
6. The per-agent `extendedConfig.durableTurnsEnabled` switch remains the emergency rollout boundary, but disabling it restores the legacy provider path and is not the preferred projection-only rollback.
