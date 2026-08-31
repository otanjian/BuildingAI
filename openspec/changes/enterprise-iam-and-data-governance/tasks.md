## 1. Identity federation and lifecycle

- [x] 1.1 Add tenant identity-provider, domain-binding, group/department mapping, SCIM cursor, and
      synchronization-event entities.
- [x] 1.2 Implement OIDC login validation and SAML adapter with issuer/audience/nonce/signature
      checks and tenant mapping.
- [x] 1.3 Implement idempotent SCIM create/update/disable/group sync, session invalidation,
      credential revocation hooks, and dry-run reconciliation.

## 2. MFA and policy enforcement

- [x] 2.1 Add tenant MFA policy and recent step-up proof handling for credential, destructive
      approval, export, and identity-policy actions.
- [x] 2.2 Add vendor-training, residency, classification, and provider-routing policy evaluation
      with fail-closed errors.
- [x] 2.3 Add compatibility and emergency break-glass flows with mandatory audit and expiry.

## 3. Data governance lifecycle

- [x] 3.1 Add classification, retention, legal-hold, data-subject-request, export-job, deletion-job,
      and completion-manifest entities.
- [x] 3.2 Apply classification/DLP masking to prompts, model routing, tool payloads, logs, traces,
      object storage, and vector metadata.
- [x] 3.3 Implement scoped export, logical deletion, asynchronous cleanup, retry, backup handling,
      and verifiable deletion evidence.

## 4. Verification and rollout

- [x] 4.1 Add tests for invalid IdP assertions, SCIM deprovision, MFA step-up, restricted field
      masking, residency blocks, export, legal hold, and deletion.
- [x] 4.2 Run IdP/SCIM dry-run and tenant pilot with rollback, data inventory, retention simulation,
      and provider-route verification.
- [x] 4.3 Run typecheck, lint, focused API/worker tests, security review, and operational runbook
      rehearsal.
- [x] 4.4 Using browser control with an IdP/SCIM sandbox and resettable governance fixtures, verify
      IdP dry-run/invalid config, SCIM event review, MFA step-up, classification/residency decision,
      export/deletion/legal-hold job status, secret/data redaction, and non-admin denial; API tests
      alone do not close this task.
