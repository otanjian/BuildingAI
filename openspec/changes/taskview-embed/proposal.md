## Why

BuildingAI users need a unified workspace to manage both AI agents and project tasks. Taskview is an existing project management tool on the same server, but there is no integration — users must log in separately and switch between two apps. Embedding Taskview into BuildingAI with shared authentication eliminates this friction.

## What Changes

- Add a new top-level "我的待办" (My Tasks) menu group in the BuildingAI console sidebar
- Menu children map to Taskview pages: tasks, kanban, graph, sprints, collaboration, integrations, webhooks, messaging, time reports, analytics, settings, account
- A new `TaskviewIframePage` renders Taskview inside a full-area iframe with automatic authentication
- On BuildingAI login, the API calls Taskview's platform-sso to obtain a Taskview session token, which is passed to the iframe via `_t` URL parameter
- User accounts are synchronized: BuildingAI username → Taskview login field, auto-creating Taskview users as needed
- Taskview is configured to allow iframe embedding from BuildingAI

## Capabilities

### New Capabilities

- `taskview-embed`: Embed Taskview project management pages inside BuildingAI console with single sign-on, synchronized user accounts, and navigable iframe for all Taskview views.

### Modified Capabilities

<!-- No existing capabilities have spec-level requirement changes -->

## Impact

- **BuildingAI**: menu seeds (`menu.json`), auth service (`auth.service.ts`), new page component (`TaskviewIframePage`), console routes, user types
- **Taskview**: iframe security headers (nginx + helmet), new `platform-sso` endpoint, frontend `_t` token consumption
- **Dependencies**: BuildingAI depends on Taskview being accessible at `http://localhost:5174`; no new npm packages
