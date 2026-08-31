## 1. Domain model and migration

- [x] 1.1 Add tenant, organization, project, membership, role, and resource-grant entities with status, expiration, and audit fields.
- [x] 1.2 Add nullable `tenantId`/`projectId` columns and composite indexes to core Agent, dataset, conversation, automation, MCP, credential, usage, and audit resources.
- [x] 1.3 Write a migration inventory and deterministic owner-to-tenant backfill command with an unmapped-resource quarantine report.

## 2. Request context and authorization

- [x] 2.1 Implement a verified tenant/project request context and reject missing or client-forged tenant identifiers.
- [x] 2.2 Implement membership lookup, RBAC roles, ABAC conditions, policy versions, and authorization cache invalidation.
- [x] 2.3 Add a service-layer resource scope helper and migrate Agent, dataset, conversation, automation, MCP, credential, export, and delete queries to use it.
- [x] 2.4 Classify existing platform/system resources and define the platform-administrator versus tenant-member authorization boundary.

## 3. API and client behavior

- [x] 3.1 Add tenant selection, membership administration, role change, suspension, expiration, and project-scope API contracts.
- [x] 3.2 Return consistent authorization and tenant-selection errors without revealing cross-tenant resource existence.
- [x] 3.3 Update web/API clients to carry the selected tenant context and remove trust in request-body tenant fields.

## 4. Verification and rollout

- [x] 4.1 Add integration tests for cross-tenant read/write/list/search/export/delete and Agent-to-dataset/MCP binding denial.
- [x] 4.2 Add migration reconciliation checks comparing legacy and scoped results for a pilot tenant.
- [x] 4.3 Run typecheck, lint, focused API tests, migration rehearsal, and a feature-flag rollback rehearsal; record evidence in the change.
- [x] 4.4 Using the browser-control workflow and a resettable fixture, verify tenant selection, member-role assignment, project grant, public-Agent tenant resolution, platform-vs-tenant binding, refresh persistence, and cross-tenant address/UI denial; API/unit tests alone do not close this task.
