## 1. Shared Agent streaming contract

- [x] 1.1 Add failing tests for a transport-neutral published-Agent SSE client covering text deltas,
      conversation IDs, malformed/empty upstream responses, and abort timeouts.
- [x] 1.2 Extract the published-Agent streaming request/parser from Feishu, keep Feishu behavior
      unchanged, and pass the focused regression tests.

## 2. Connection persistence and security

- [x] 2.1 Add failing tests for WeCom connection validation, normalization, response masking, and
      credential encryption requirements.
- [x] 2.2 Add the `wecom_aibot_connection` entity, indexes, Agent foreign key, versioned migration,
      exports, and separate AES-256-GCM credential encryption.
- [x] 2.3 Add repository service tests for create/update, blank-secret preservation, duplicate
      BotID, unsupported Agent, independent lifecycle actions, and safe deletion.

## 3. WeCom runtime and message delivery

- [x] 3.1 Add the official WeCom intelligent-robot SDK and failing adapter tests for authentication,
      connection status, disconnection, and credential testing.
- [x] 3.2 Implement connection-scoped Redis lease ownership, startup restore, renewal/loss handling,
      tombstones, and runtime-state cleanup with focused tests.
- [x] 3.3 Add failing message tests for text extraction, direct/group scope, msgid idempotency,
      per-chat serialization, conversation continuation, and unsupported-message filtering.
- [x] 3.4 Implement rate-safe native WeCom stream replies, UTF-8 byte truncation, finalization,
      timeout/error handling, and deleted-connection send guards with focused tests.
- [x] 3.5 Add a startup-order regression test and defer persisted connection restoration until
      application bootstrap so pending database migrations complete first.

## 4. Console API and user interface

- [x] 4.1 Add paginated connection CRUD, credential-test, and toggle console endpoints with explicit
      permissions and controller/service tests.
- [x] 4.2 Add typed console service hooks and register the WeCom connection list, create, and edit
      routes plus navigation/menu metadata.
- [x] 4.3 Build the connection list and form using existing UI patterns, standard-Agent filtering,
      masked secret behavior, status/error feedback, and delete confirmation.
- [x] 4.4 Add focused client tests for Agent filtering, create/edit restoration, masked inputs,
      status actions, and connection-targeted mutations.

## 5. Verification and rollout

- [x] 5.1 Run focused API and client tests, then API/client lint and typecheck; fix all regressions
      introduced by this change.
- [x] 5.2 Run production builds, validate `add-wecom-agent-channel`, and record fresh verification
      evidence.
- [ ] 5.3 Manually smoke-test direct/group text streaming, duplicate delivery, restart recovery, and
      multi-instance lease behavior with live WeCom credentials when available.

### Verification evidence (2026-08-29)

- `pnpm --filter @buildingai/db build`: passed.
- `pnpm --filter @buildingai/api build`: passed after the database package build completed.
- `pnpm --filter buildingai-client build:web`: passed (existing chunk-size warnings only).
- API focused regression suite: 9 suites and 51 tests passed.
- Client suite: 42 files and 166 tests passed.
- Database/API/client type checks and changed-file lint checks: passed.
- `openspec validate add-wecom-agent-channel`: passed.
- Restart smoke test: the pending WeCom migration completed before connection restoration, and the
  API/Web development servers returned HTTP 200 on ports 4090/4091.
- Live WeCom credential smoke testing remains pending because no BotID/Secret was available locally.
