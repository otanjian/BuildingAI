# Verification — enterprise-secret-and-credential-security

## Automated verification

- `pnpm --filter @buildingai/db build` — passed.
- `pnpm --filter @buildingai/core build` — passed.
- `pnpm --filter @buildingai/api check-types` — passed.
- `pnpm --filter @buildingai/api lint` — passed.
- `pnpm --filter buildingai-client exec eslint . --quiet` — passed.
- Focused API verification — 5 suites and 36 tests passed. Coverage includes tenant/project isolation, environment and scope checks, current-version resolution, expiry, revocation, overlap rotation, service-token expiry, audience validation, and replay rejection.
- Local migration rehearsal — `1788300000000-26.1.5-add-enterprise-credential-security`, `1788310000000-26.1.5-add-credential-references`, and `1788320000000-26.1.5-allow-credential-only-channels` applied successfully. Credential references cover Agent publish config, MCP servers, Feishu connections, and WeCom connections.
- `pnpm security:scan -- openspec/changes/enterprise-secret-and-credential-security packages/api/src/modules/ai/secret packages/core/src/modules/secret` — passed; 26 files inspected and output is redacted.
- Production configuration probes — missing/unsupported credential provider fails closed; explicit `kms` with `BUILDINGAI_CREDENTIAL_KMS_KEY` completes an AES-GCM round trip; OpenCode production requires `BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY`.

## Implementation evidence

- Generic secret writes use versioned AES-256-GCM envelopes with nonce, authentication tag, algorithm, and key version. Production rejects the local/test provider.
- Credential metadata endpoints return provider, purpose, scope, version, expiry, last-used, fingerprint, and status; secret material is never returned.
- Agent publish/API tokens are HMAC-hashed for inbound checks and linked to encrypted credential versions. New publish mutations return a bearer token once so the UI can construct a public link; the token is not persisted in Agent JSON. Legacy plaintext fields are dual-read only during migration and are cleared after an encrypted version is verified.
- MCP, SAP/ERP, Feishu, and WeCom runtime paths resolve credential references through a tenant/project/environment/scope-aware short-lived resolver. Legacy fields remain read-only compatibility paths until the migration report reaches zero pending values.
- OpenCode internal credential requests use an audience-bound, 60-second, one-time service token. The configured static key is accepted only outside production for compatibility.

## Browser acceptance status

Administrator acceptance passed using the local test KMS/mock connection path. The only direct URL entry was the login page. The tester then clicked the visible `工作台` menu, clicked `密钥管理`, clicked `租户管理` to select the active tenant, and returned to `密钥管理`; no business route was typed.

- Created a disposable credential from the visible form. The UI showed `••••`, fingerprint, provider, purpose, version, and `active`; the submitted secret was absent from the DOM snapshot.
- Rotated through the visible `轮换` action. The page showed version 2 and continued masking; the rotated secret was absent from the DOM.
- Clicked visible `连接测试`; the UI reported `连接测试通过（服务端未返回明文）`.
- Clicked visible `撤销`; the page showed `revoked`. Clicking the same visible connection-test action then reported `Credential is revoked or expired`; both original and rotated values remained absent.
- The visible navigation menu contained `密钥管理` and `租户管理`, proving the route was reachable through the menu rather than a guessed URL. Browser console logs contained no submitted secret.

Read-only browser acceptance also passed in the earlier isolated fixture run: the user logged in through the login page, entered the console through the visible `工作台` menu, clicked the visible `密钥管理` menu, and received a safe `权限不足` denial without credential/provider metadata or test values. A later re-run in this session was blocked by the local browser/API port state (`Network Error` in the browser while the same request succeeded with curl); that environment issue is recorded separately and is not treated as a product pass/fail signal. The accepted evidence still satisfies the denial criterion, and the next change remains gated on keeping this browser route available in the test environment.
