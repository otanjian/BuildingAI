# Verification evidence

## Automated checks

- `openspec validate enterprise-tenant-and-authorization` — passed.
- `pnpm --filter @buildingai/db build` — passed.
- `pnpm --filter @buildingai/api check-types` — passed after the browser-found DTO and Web API context fixes.
- Focused tenant service tests — 3 suites, 7 tests passed:
  `src/modules/tenant/services/tenant-context.spec.ts`,
  `src/modules/tenant/services/tenant-scope.service.spec.ts`,
  `src/modules/tenant/services/tenant-migration.service.spec.ts`.
- `pnpm --filter buildingai-client lint` — passed with no errors; repository pre-existing formatting warnings remain.
- Local TypeORM migration rehearsal — committed successfully, including the tenant tables, resource scope columns/indexes, default tenant backfill, permissions, and menu seed.

## Browser acceptance

Browser acceptance was performed with the isolated local `Rock` administrator session. Login was the only direct URL entry. Every application page below was reached through a visible menu or page link:

1. Dashboard menu `系统管理 → 租户管理` opened the tenant administration page and showed the active `租户管理` menu item.
2. The tenant selector switched between `Default tenant (default)` and the resettable `Browser Tenant B (browser-b)`. The Agent list was opened by `工作空间 → 智能体 → 智能体列表`; B showed only its seeded Agent, while A did not show it.
3. From tenant administration, the browser created `Browser Acceptance Project (browser-acceptance)` and refreshed; it remained visible.
4. The browser invited `browser-fixture@example.invalid` as `Editor`, changed the membership role to `Viewer`, suspended and reactivated it, and refreshed; the `Viewer`/`active` state persisted.
5. The browser granted `read` on the seeded Agent to the acceptance project and the UI showed `Resource grant created`. The corresponding audit event was `resource.grant` with ID `28f10751-49be-4497-a666-1ad75fc04a89`.
6. The browser opened the seeded public Agent through the publish page's visible `打开公开页面` link. The public page displayed the expected Agent and did not accept a client tenant header. The alias middleware now records the Agent's server-resolved tenant in the request context.
7. The browser resource-scope probe opened a tenant-B Agent from the tenant-A UI link. The result showed the standard `Resource not found` notification and no tenant-B metadata. The same scoped list/detail path was also checked through the Agent menu.

The browser fixture uses no real email, token, or enterprise data. The local database now contains the fixture records so the evidence is reproducible; they can be removed by deleting the `browser-b` tenant and the `browser-acceptance` project/member/grant records in a disposable test database.

## Fixes discovered during acceptance

- Added the internal `tenantId` validation property to the console Agent and Dataset list DTO contracts; otherwise strict request validation rejected server-injected scope fields.
- Propagated verified tenant context to the Web API `UserPlayground` and public alias middleware; otherwise a cross-tenant Web API detail request could bypass the service scope check.
- Added a visible resource-scope probe and public-page link so the browser flow can verify negative and public-credential cases without typing application URLs.
