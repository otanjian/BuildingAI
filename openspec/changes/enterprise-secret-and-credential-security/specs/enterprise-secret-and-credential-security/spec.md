## Purpose

为企业 AI 平台提供不可明文恢复、可轮换、可吊销和最小权限的凭据生命周期，降低数据库、日志、模型上下文和内部接口泄露造成的影响。

## ADDED Requirements

### Requirement: Store credentials as tenant-scoped encrypted secrets

The system SHALL store third-party credentials and platform API secrets in a tenant-scoped credential record containing authenticated ciphertext, nonce or equivalent cryptographic metadata, algorithm, key version, purpose, scopes, environment, expiration, and revocation state. Base64 encoding SHALL NOT be treated as encryption.

#### Scenario: Persist a credential

- **WHEN** an authorized administrator creates an ERP credential for a tenant
- **THEN** the persisted record contains only encrypted secret material and non-sensitive metadata, and the plaintext is not returned by the API

#### Scenario: Reject unavailable encryption configuration

- **WHEN** the configured KMS/Vault key or cryptographic configuration is unavailable
- **THEN** credential creation and rotation fail closed with an actionable error and no plaintext is persisted

### Requirement: Enforce least-privilege credential access

The system SHALL issue or resolve a credential only for an authorized tenant, Agent version, tool, environment, and declared scope. Credential values SHALL NOT be included in model prompts, tool descriptions, client responses, ordinary logs, or unredacted audit payloads.

#### Scenario: Resolve a tool credential

- **WHEN** an approved Tool Gateway invocation requests a credential reference bound to the current Agent version
- **THEN** the runtime receives the minimum required secret for the short-lived execution context and the audit event records only the reference and scope

#### Scenario: Reject an out-of-scope reference

- **WHEN** a tool attempts to use a credential owned by another tenant, environment, or Agent version
- **THEN** the system denies resolution before contacting the external system

### Requirement: Support credential rotation and revocation

The system SHALL support create, rotate, expire, revoke, and last-used inspection operations. Rotation SHALL support an overlap window for in-flight requests, and revocation SHALL prevent new resolution immediately or within the documented propagation window.

#### Scenario: Rotate a credential

- **WHEN** an administrator rotates an active credential
- **THEN** the new key version becomes the preferred version, the old version remains usable only for the configured overlap window, and the rotation is audited

#### Scenario: Revoke a leaked credential

- **WHEN** a security operator revokes a credential
- **THEN** new tool executions using that reference are denied and an alert is emitted for subsequent attempts

### Requirement: Protect internal service authentication

The system SHALL require a non-default authenticated service identity for internal credential/bootstrap endpoints. Production startup SHALL fail when the required identity or trust configuration is missing or uses a known development default.

#### Scenario: Call an internal endpoint without service identity

- **WHEN** a client calls an internal OpenCode credential endpoint without a valid mTLS identity or short-lived service token
- **THEN** the request is rejected before credential processing and no secret metadata is disclosed

#### Scenario: Detect a development default

- **WHEN** production starts with a predictable default internal key
- **THEN** startup fails with a configuration error and does not expose the internal endpoint

#### Scenario: Reject a non-production provider in production

- **WHEN** production is configured with the development crypto provider or a test KMS adapter
- **THEN** startup fails closed and no credential-management endpoint becomes ready

### Requirement: Detect and respond to secret exposure

The system SHALL provide scanning and operational controls to detect likely credentials in source, database exports, logs, object storage, and container artifacts. Detected credentials SHALL be quarantined when possible and revoked according to the incident policy.

#### Scenario: Find a leaked API key in a log sink

- **WHEN** a secret scanner matches a high-confidence credential pattern in a log or artifact
- **THEN** the system creates a security event, masks/quarantines the finding, and identifies the credential for rotation or revocation

### Requirement: Verify credential safety through the browser console

The system SHALL provide an authorized browser console workflow for creating or registering a credential, viewing non-secret metadata, rotating, revoking, and testing connectivity. The browser SHALL never render the plaintext after submission, and unauthorized users SHALL see a safe denial.

#### Scenario: Rotate a credential in the browser

- **WHEN** a tenant credential administrator opens the credential page, creates a masked test credential, rotates it, and refreshes the page
- **THEN** the page shows provider, purpose, scope, key version, expiry, last-used and status metadata, but never the secret value; the new version is active

#### Scenario: Verify revoked behavior in the browser

- **WHEN** the tester revokes the credential and uses the browser connection-test action
- **THEN** the connection is denied with a safe revoked/expired message, the page shows the revoked status, and an audit event is available

#### Scenario: Reject an unauthorized browser user

- **WHEN** a read-only member opens the credential route or guesses a credential ID
- **THEN** the browser shows forbidden/not-found without provider secrets, headers, or existence details
- **AND** browser network responses, downloaded files, and client-side error messages contain no plaintext secret
