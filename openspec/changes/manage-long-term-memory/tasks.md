## 1. OpenSpec and API contract

- [x] 1.1 Confirm the existing `UserMemory` ownership fields and document supported category values and content limits.
- [x] 1.2 Add create/update/clear DTOs and controller routes with authenticated-user ownership checks.
- [x] 1.3 Extend `MemoryService` with user-scoped create, update, deactivate-all, and duplicate handling; fix single-delete to update by `id + userId`.

## 2. Backend verification

- [x] 2.1 Add service/controller tests for list, create validation, update, single delete, clear-all, duplicate submission, and cross-user isolation.
- [x] 2.2 Run API lint, typecheck, and focused test commands; resolve regressions.

## 3. Frontend data and navigation

- [x] 3.1 Extend the shared user-memory React Query service with create, update, single-delete, and clear-all hooks and cache invalidation.
- [x] 3.2 Add a `longTermMemory` settings page type, navigation item, icon, and component registration.
- [x] 3.3 Add Chinese and English translations for menu labels, forms, validation, confirmations, empty/error/loading states, and privacy hints.

## 4. Frontend management UI

- [x] 4.1 Build the long-term memory page with responsive list/table or card layout, category and updated-time display, and empty state.
- [x] 4.2 Implement reusable add/edit dialog with field validation, pending state, success/error feedback, and cache refresh.
- [x] 4.3 Implement single-delete and clear-all confirmation flows with accessible labels and mobile-safe layout.

## 5. End-to-end verification

- [x] 5.1 Run client lint and typecheck plus relevant component tests.
- [x] 5.2 Manually verify login, menu visibility, add/edit/delete/clear flows, refresh persistence, cross-user isolation, and narrow-screen rendering.
- [x] 5.3 Run `openspec validate "manage-long-term-memory" --strict` and update task checkboxes only after verification passes.
