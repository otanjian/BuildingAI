## 1. Credential model and cryptography

- [x] 1.1 Add tenant-scoped credential and credential-version entities with AEAD metadata, scopes, environment, expiry, revocation, and last-used fields.
- [x] 1.2 Implement a KMS/Vault adapter with envelope encryption, key-version lookup, startup validation, and a safe development provider.
- [x] 1.3 Replace Base64-only generic secret handling with the adapter and add focused cryptographic round-trip and tamper tests.

## 2. Runtime and API migration

- [x] 2.1 Add credential create, rotate, revoke, expire, inspect-metadata, and short-lived resolve APIs with tenant and Agent-version authorization.
- [x] 2.2 Migrate Agent publish tokens/API keys, MCP headers, SAP/ERP credentials, and channel secrets to credential references; hash inbound tokens.
- [x] 2.3 Implement dual-read migration, backfill/rotation reporting, and cleanup of legacy plaintext fields after successful verification.

## 3. Internal service hardening

- [x] 3.1 Replace the internal OpenCode shared-key default with mTLS or audience-bound short-lived service tokens and production startup checks.
- [x] 3.2 Add runtime redaction for prompts, responses, headers, errors, logs, metrics labels, and audit payloads; prohibit secret values in client responses.
- [x] 3.3 Add secret scanning for repository artifacts, logs, object storage exports, database dumps, and container images with incident hooks.

## 4. Verification and operations

- [x] 4.1 Add cross-tenant, cross-environment, scope, expiry, revocation, replay, and rotation-overlap integration tests.
- [x] 4.2 Document KMS outage, key compromise, emergency revoke, backup restore, and operator break-glass runbooks.
- [x] 4.3 Run lint, typecheck, focused API tests, migration rehearsal, and a production-configuration fail-closed check.
- [x] 4.4 Using browser control with a test KMS and mock endpoint, verify create/rotate/mask/revoke/connection-test, production-provider fail-closed, read-only denial, and that UI/network/download/log evidence contain no plaintext secret; API tests alone do not close this task.
