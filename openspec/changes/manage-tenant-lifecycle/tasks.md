## 1. Backend contracts and tests

- [x] 1.1 Add DTOs and controller contract tests for tenant list filters, create, status update,
      archive, and member removal.
- [x] 1.2 Add service tests for transactional tenant creation, duplicate-code rejection,
      default/data-bearing tenant protection, and sole-administrator protection.

## 2. Backend implementation

- [x] 2.1 Implement filtered/paginated tenant listing with member counts and opening dates while
      preserving the existing tenant-context response used by switchers.
- [x] 2.2 Implement platform-admin tenant creation with existing-user or atomic new-user
      administrator assignment and audit records.
- [x] 2.3 Implement tenant status update and safe archive deletion, excluding archived tenants from
      user context resolution.
- [x] 2.4 Implement tenant member deletion with administrator guard and policy/audit updates.
- [x] 2.5 Enforce tenant boundaries for user-list tenant filtering and preserve tenant-scoped user
      creation.

## 3. Frontend tenant management

- [x] 3.1 Add tenant service types/hooks for list filters, create, status update, archive, and
      member deletion.
- [x] 3.2 Replace the tenant overview page with a filterable tenant table showing code, name,
      status, member count, and opening date, including the create action and row actions.
- [x] 3.3 Add tenant creation dialog with validation and administrator selection/new-user fields.
- [x] 3.4 Add a tenant member route/page with add, remove, administrator, and status operations.
- [x] 3.5 Add an "所属租户" filter to user management, limited to platform administrators in the UI.

## 4. Verification

- [x] 4.1 Run targeted API tests, client typecheck/lint, and OpenSpec validation.
- [ ] 4.2 Perform authenticated browser verification for filtering, creation, status changes, member
      add/remove, protected delete, and tenant navigation.
