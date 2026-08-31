## Purpose

为企业 AI 平台提供可验证的租户、组织、项目和资源授权边界，使同一平台上的多个企业能够安全协作并防止跨租户数据访问。

## ADDED Requirements

### Requirement: Establish tenant and project context

The system SHALL resolve exactly one active tenant for every authenticated user or service request, and SHALL carry an optional project context. The tenant and project context SHALL come from verified identity or server-side routing metadata rather than trusted request-body fields.

#### Scenario: Resolve a member tenant

- **WHEN** a user belonging to two tenants selects one tenant and calls an Agent API
- **THEN** the request context contains the selected tenant, the selected tenant is active, and all downstream resource queries use that tenant scope

#### Scenario: Reject an ambiguous tenant request

- **WHEN** a user belonging to multiple tenants calls a tenant-scoped API without a tenant context
- **THEN** the system rejects the request with an actionable tenant-selection error and performs no resource operation

#### Scenario: Resolve a public Agent request

- **WHEN** an anonymous client calls a published Agent using a valid scoped public credential
- **THEN** the system resolves the owning tenant and published Agent version from the server-side credential, applies the publication audience/scope, and does not accept a client-supplied tenant ID

### Requirement: Distinguish platform-scoped and tenant-scoped resources

The system SHALL classify resources as platform-scoped or tenant-scoped. Platform catalogs and explicitly approved system tools MAY be shared, while tenant-scoped resources SHALL always require tenant authorization. Cross-scope bindings SHALL be explicit, versioned, and auditable.

#### Scenario: Use an approved system catalog

- **WHEN** a tenant Agent reads an active platform model catalog entry
- **THEN** the system exposes only the catalog fields allowed by platform policy and records the tenant context without copying the catalog into another tenant

#### Scenario: Reject an unapproved global binding

- **WHEN** a user attempts to bind an arbitrary global resource to a tenant Agent
- **THEN** the operation is rejected unless an explicit platform policy and audit record authorize that binding

### Requirement: Manage organization membership and roles

The system SHALL allow an authorized tenant administrator to create, suspend, expire, and change roles for tenant memberships. A membership SHALL identify the tenant, user, organization or department, role, status, and optional expiration.

#### Scenario: Suspend a member

- **WHEN** a tenant administrator suspends a member
- **THEN** new requests by that membership are denied and cached authorization decisions are invalidated within the configured propagation window

#### Scenario: Prevent unauthorized role changes

- **WHEN** a project member attempts to change another member's tenant role
- **THEN** the system denies the operation and creates an authorization-denied audit event

#### Scenario: Preserve platform administrator boundary

- **WHEN** a platform administrator enters the system-level console without an active tenant selection
- **THEN** the system exposes only explicitly platform-scoped operations and requires an active tenant context before any tenant resource operation

### Requirement: Enforce resource-level authorization

The system SHALL evaluate tenant, project, resource ownership or grant, requested action, actor role, resource classification, environment, and policy conditions before returning or mutating a resource. Resource identifiers supplied by a client SHALL NOT bypass this evaluation.

#### Scenario: Reject cross-tenant access

- **WHEN** an authenticated user references an Agent belonging to another tenant
- **THEN** the system behaves as if the resource is unavailable and does not disclose its existence or mutate it

#### Scenario: Allow an explicit project grant

- **WHEN** a user has an active project-level `read` grant for a dataset in the current tenant
- **THEN** the system returns the dataset metadata permitted by its classification and records the authorization context

### Requirement: Scope list, search, and execution operations

The system SHALL apply the same tenant and resource authorization filters to list, search, retrieve, export, delete, Agent execution, automation execution, and MCP execution operations. A service-layer check SHALL remain authoritative even when a controller guard has run.

#### Scenario: Filter a resource list

- **WHEN** a user lists Agents in a tenant
- **THEN** the result contains only Agents the user may read in that tenant and project scope

#### Scenario: Prevent an unauthorized Agent dataset binding

- **WHEN** a user binds a dataset from another project or tenant to an Agent
- **THEN** the operation is rejected before persistence and no partial binding is created

### Requirement: Migrate legacy resources without widening access

The system SHALL map existing resources to an explicit default tenant or a reviewed ownership queue, record the mapping source, and SHALL NOT silently expose unmapped resources across tenants. New writes SHALL require a non-null tenant context after the migration gate is enabled.

#### Scenario: Backfill a legacy resource

- **WHEN** a legacy Agent has a resolvable owner and the owner is assigned to a default tenant
- **THEN** the resource receives that tenant and project mapping with a migration audit record

#### Scenario: Handle an unmapped resource

- **WHEN** a legacy dataset cannot be mapped confidently
- **THEN** the dataset remains inaccessible to normal tenants and appears only in a restricted ownership queue

### Requirement: Protect tenant lifecycle invariants

The system SHALL prevent a tenant from becoming active without an owner, SHALL prevent removal or suspension of the last active tenant administrator without an approved replacement, and SHALL stop new resource execution when a tenant is suspended. Tenant lifecycle changes SHALL be auditable.

#### Scenario: Reject removal of the last administrator

- **WHEN** an administrator attempts to remove the only active tenant administrator without assigning a replacement
- **THEN** the operation is rejected and the tenant remains administrable

#### Scenario: Suspend a tenant

- **WHEN** a platform operator suspends a tenant
- **THEN** new Agent, retrieval, automation, export, and tool execution requests are denied while read-only compliance inspection remains available to authorized operators

### Requirement: Verify tenant authorization through the browser console

The system SHALL expose a browser-accessible tenant administration workflow that allows an authorized tenant administrator to select the active tenant, manage members and project grants, and see the effective role. The workflow SHALL use the same authorization APIs as non-browser clients and SHALL show a safe denial for cross-tenant resources.

#### Scenario: Manage a member in the browser

- **WHEN** a tester signs in as a tenant administrator, opens the tenant administration page, invites a test user, assigns a project role, and refreshes the page
- **THEN** the member, organization/project scope, role, status, and effective permissions are visible and persist after refresh

#### Scenario: Verify cross-tenant denial in the browser

- **WHEN** the tester switches to tenant A, opens a resource ID seeded for tenant B through the browser address bar or UI link
- **THEN** the browser shows the standard not-found/forbidden state, exposes no tenant B metadata, and no mutation occurs
- **AND** the browser evidence includes the sanitized UI result, request status, and audit ID without relying on a direct API-only assertion
