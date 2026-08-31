## 1. Persistent model and secure migration

- [ ] 1.1 Add failing tests for legacy parsing, migration idempotency, duplicate App IDs, malformed records, orphan Agents, and generated connection metadata.
- [x] 1.2 Add the Feishu connection entity, migration, Agent foreign-key policy, normalized App ID/name indexes, migration status, and repository queries.
- [x] 1.3 Add versioned AES-256-GCM credential encryption/decryption with startup key validation and tests that plaintext secrets never enter connection responses or logs.
- [x] 1.4 Implement idempotent import from legacy Dict records, including conflict/quarantine status and source-key tracking; dry-run remains a rollout follow-up.
- [ ] 1.5 Add service tests for two connections per Agent, edit isolation, concurrent duplicate binding, unsupported/orphan connections, and secret preservation.
- [x] 1.6 Name the connection migration with the current platform semantic version so installed-version startup reconciliation discovers it by migration history name.

## 2. Runtime ownership and lifecycle

- [x] 2.1 Refactor active connection and status maps to use connection ID and add a connection-scoped distributed lease with renewal and token-safe release.
- [x] 2.2 Refactor event idempotency, conversation, CardKit observer, and recovery keys to use connection ID while preserving legacy agent-ID fallback.
- [x] 2.3 Implement deleting/tombstone state, send-before-state checks, and connection-scoped runtime cleanup; in-flight cancellation remains a follow-up.
- [ ] 2.4 Preserve standard-agent CardKit streaming, fallback reply, and startup listener behavior with focused regression tests.
- [ ] 2.5 Add tests that disabling, deleting, or losing a lease for one connection cannot affect another connection for the same Agent.

## 3. Console API and permissions

- [x] 3.1 Add paginated `/connections` list/detail/create/update/test/toggle/delete routes with explicit connection ID paths and permission checks.
- [x] 3.2 Retain legacy Agent-ID routes as a narrowly scoped adapter that rejects ambiguous multi-connection operations.
- [x] 3.3 Add client service hooks/types for paginated list, detail, create, update, test, toggle, delete, migration status, and credential-presence flags.
- [ ] 3.4 Add API tests for database conflict errors, masked responses, missing connection errors, unsupported Agents, stale updates, and secret non-echo behavior.

## 4. List-first console experience

- [x] 4.1 Add the Feishu connection list page with server pagination, empty state, search, migration status, status badges, and permission-aware actions.
- [x] 4.2 Add new/edit connection routes and form with standard-Agent token guidance, secret preservation, independent credential test, and save-without-enable behavior.
- [x] 4.3 Add delete confirmation and connection-level enable/disable actions with query invalidation and error feedback.
- [x] 4.4 Update route registration and menu behavior so clicking “飞书机器人” always lands on the list page.
- [ ] 4.5 Add focused client tests for pagination, duplicate-Agent connections, edit restoration, masked fields, conflict display, and action targeting.

## 5. Verification and rollout

- [ ] 5.1 Run migration dry-run against representative legacy data, including duplicate App IDs and missing Agents; verify no secret appears in output.
- [x] 5.2 Run focused API tests, API lint, and typecheck.
- [x] 5.3 Run client tests, lint, typecheck, and build.
- [x] 5.4 Validate the OpenSpec change; manual production smoke testing remains deployment follow-up for two Apps bound to one Agent, independent toggles, duplicate App rejection, multi-instance lease ownership, restart recovery, and deletion during an in-flight reply.
