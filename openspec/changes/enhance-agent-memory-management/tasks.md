## 1. OpenSpec and test scaffolding

- [x] 1.1 Add agent-memory API/service tests for accessible-agent filtering and user isolation.
- [x] 1.2 Add frontend copy/helper tests for the renamed navigation and editor labels.

## 2. Backend

- [x] 2.1 Add authenticated agent-memory DTOs and web routes for list, accessible agents, create, update, delete, and clear.
- [x] 2.2 Implement permission-aware agent lookup and user-scoped AgentMemory CRUD in MemoryService.
- [x] 2.3 Export the new service hooks/types through the web services package.

## 3. Frontend

- [x] 3.1 Rename the settings menu/page copy to “记忆” and add agent-memory translations.
- [x] 3.2 Replace the global-memory card grid with responsive agent/content columns and accessible-agent selection.
- [x] 3.3 Add full-screen content editing and explicit close/cancel controls.

## 4. Verification

- [x] 4.1 Run focused backend/frontend tests and lint the changed files.
- [x] 4.2 Validate the OpenSpec change and perform a fresh browser/source check against the running client.
