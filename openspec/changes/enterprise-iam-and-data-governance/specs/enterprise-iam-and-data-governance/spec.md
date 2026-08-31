## Purpose

让企业能够用现有身份目录安全接入 AI 平台，并对对话、知识、向量、工具输出和日志实施分类、留存、删除、驻留和数据主体治理。

## ADDED Requirements

### Requirement: Support enterprise identity federation

The system SHALL support tenant-bound OIDC federation and SHALL support SAML federation where configured. It SHALL validate issuer, audience, signature, nonce, redirect constraints, and tenant/domain mapping before creating a session.

#### Scenario: Sign in through a bound IdP

- **WHEN** a user authenticates with an IdP bound to the current tenant and presents a valid assertion
- **THEN** the system creates a session with the mapped tenant membership and records the identity source

#### Scenario: Reject an unbound assertion

- **WHEN** an assertion has an unknown issuer, audience, signature, or tenant mapping
- **THEN** the system rejects login and does not create or switch tenant membership

### Requirement: Synchronize account lifecycle

The system SHALL support SCIM or an equivalent signed directory synchronization for users, groups, departments, and disable/termination events. A disabled or removed membership SHALL invalidate sessions and credentials according to the configured propagation window.

#### Scenario: Deprovision a user

- **WHEN** the enterprise directory marks a user inactive
- **THEN** the platform disables the mapped memberships, invalidates active sessions, and prevents new Agent/tool execution

#### Scenario: Sync a group role

- **WHEN** a synchronized group is mapped to a tenant/project role
- **THEN** members receive only that scoped role and the change is auditable

### Requirement: Require MFA for sensitive actions

The system SHALL support tenant-enforced MFA and SHALL require step-up authentication for configured sensitive actions such as managing credentials, approving destructive tools, exporting restricted data, and changing identity policy.

#### Scenario: Approve a destructive action

- **WHEN** an authenticated user without a recent step-up proof attempts to approve a destructive tool call
- **THEN** the approval is blocked and the user is prompted for the tenant's configured MFA method

### Requirement: Classify and minimize AI data

The system SHALL classify conversations, uploaded documents, segments, embeddings, prompts, tool payloads, logs, and backups according to tenant policy. Sensitive fields SHALL be masked or excluded before model/vendor transmission unless explicitly allowed.

#### Scenario: Send restricted data to a model

- **WHEN** a prompt contains a field classified as strictly restricted and the selected model policy does not allow it
- **THEN** the system masks or blocks the field and records the policy decision

### Requirement: Enforce retention, export, deletion, and legal hold

The system SHALL support data-class retention policies, scoped export, deletion/correction requests, legal holds, asynchronous execution, failure retry, and a verifiable completion record. Legal-held data SHALL NOT be physically deleted until the hold is released.

#### Scenario: Export a tenant's data

- **WHEN** an authorized tenant administrator requests an export for a permitted scope
- **THEN** the system creates a bounded export job, applies classification rules, provides progress, and records the resulting manifest

#### Scenario: Delete data under legal hold

- **WHEN** a deletion request includes records covered by an active legal hold
- **THEN** those records are excluded with a documented reason while eligible records continue through the deletion job

### Requirement: Enforce data residency and vendor policy

The system SHALL route storage, logging, vector indexing, and model/provider calls according to tenant data-residency, cross-region, retention, and vendor-training policies. Disallowed routes SHALL fail closed.

#### Scenario: Block a disallowed provider route

- **WHEN** a restricted tenant request would send data to a provider outside its allowed region or training policy
- **THEN** the system blocks the route or selects an approved provider and records the decision

### Requirement: Provide safe identity and governance administration in the browser

The system SHALL expose an authorized browser administration workflow for configuring a tenant-bound IdP, validating configuration in dry-run mode, reviewing SCIM synchronization, setting MFA/data/residency policies, and monitoring export, deletion, and legal-hold jobs. Secrets and unrestricted data SHALL NOT be displayed.

#### Scenario: Validate an IdP in the browser

- **WHEN** a tenant administrator enters a seeded IdP configuration and runs browser dry-run validation
- **THEN** the UI reports issuer/audience/domain/certificate checks, does not activate an invalid configuration, and shows the validation event

#### Scenario: Review SCIM deprovision in the browser

- **WHEN** an operator opens the synchronization page after a seeded user-disable event
- **THEN** the browser shows the event status, affected membership/session/credential actions, and retry/error information

#### Scenario: Verify governance job state in the browser

- **WHEN** an authorized auditor opens a seeded export, deletion, or legal-hold job
- **THEN** the UI shows scope, classification summary, progress, blocked records and completion evidence without unrestricted content

#### Scenario: Deny policy administration to a member

- **WHEN** a non-administrator visits the IdP, MFA, residency, or legal-hold management page
- **THEN** the browser shows forbidden/not-found and does not reveal configuration values or job details
- **AND** direct navigation, browser network responses, and downloads do not disclose IdP secrets or restricted data
