# Credential security runbooks

## KMS/Vault outage

1. Confirm the provider health check and key-version status; do not switch production to the local provider.
2. Set the credential resolver to fail closed for new writes and new tool executions.
3. Allow only already-running requests within their documented short-lived lease; never cache plaintext.
4. Page the on-call owner and record the incident ID in the tenant audit stream.

## Key compromise

1. Disable the compromised KMS key version and preserve the audit trail.
2. Create a new key version, rotate credentials by tenant and environment, then verify provider connectivity.
3. Revoke credentials whose ciphertext or fingerprint may have been exposed; quarantine affected exports and logs.
4. Run `pnpm security:scan` against source, dumps, logs, object-storage exports, and image files before closing the incident.

## Emergency revoke / suspected leak

1. Use the console revoke action or the operator job to revoke the credential reference.
2. Confirm new resolver attempts fail and that an alert/audit event contains only the reference, scope, and fingerprint.
3. Rotate the third-party credential out of band and create a new version after verification.

## Backup restore

1. Restore into an isolated environment with production KMS access disabled.
2. Verify tenant, project, version, revocation, and key-version metadata before promoting the restore.
3. Run migration rehearsal and secret scanning; do not export or print decrypted values.

## Operator break-glass

Break-glass requires an approved incident ticket, MFA, a time-bound role, and dual approval. Operators may inspect metadata or run a sandbox connection test; plaintext reveal is not supported. Every action is audited and the role is revoked automatically at expiry.
