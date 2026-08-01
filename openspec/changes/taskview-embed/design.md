## Context

BuildingAI (React + NestJS monorepo) needs to embed Taskview (Vue 3 + Express monorepo at `/home/Taskview/taskview-community`) inside the console. BuildingAI already has an iframe embed pattern (`AppIframePage` with `_t` token passing) and a platform SSO pattern (`POST /auth/platform-sso`). Taskview currently blocks iframe embedding via `X-Frame-Options: SAMEORIGIN` in nginx and Helmet defaults.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Embed Taskview in BuildingAI console sidebar as "我的待办" menu group
- Single sign-on: BuildingAI login → Taskview auto-login in iframe
- Username-based user sync: BuildingAI username = Taskview login
- Support all Taskview views (tasks, kanban, graph, sprints, collab, integrations, webhooks, messaging, time-reports, analytics, settings, account)
- Static menu configuration (no runtime sync from Taskview APIs)

**Non-Goals:**
- Bidirectional user sync (BuildingAI → Taskview only)
- Organization-level access control in menu (default to first available org)
- Taskview user management from BuildingAI UI

## Decisions

### D1: Token passing via `_t` URL parameter (same as AppIframePage)

BuildingAI's `AppIframePage` already passes tokens as base64-encoded `_t` query params. This pattern is proven, works across origins in iframes, and avoids cookie-domain issues.

**Alternative considered:** `postMessage` token delivery.
Rejected because it's asynchronous and would require loading Taskview first, then sending the token — causing a flash of unauthenticated state.

### D2: New `platform-sso` endpoint on Taskview (mirrors BuildingAI's own pattern)

Taskview gets `POST /module/auth/platform-sso` that:
1. Validates a shared `TASKVIEW_SSO_SECRET` env var
2. Finds user by login (username) or auto-creates one
3. Returns `{ access, refresh, userData }`

**Alternative considered:** Direct DB insertion into `tv_auth.users`.
Rejected because Taskview's auth module manages token creation, session storage, and password hashing — bypassing it would break TokenService and session features.

### D3: Menu items statically seeded in BuildingAI (not synced from Taskview)

The menu tree is defined in `menu.json` seeds with `component: "/console/taskview/[viewName]"`. All items route to `TaskviewIframePage`, which reads the view from the URL path and maps it to a Taskview route.

**Alternative considered:** Dynamic menu API from Taskview.
Rejected because Taskview has no menu API, and the user wants initialization only.

### D4: TaskviewIframePage uses Route params to determine the Taskview view

The page reads the current URL path (e.g., `/console/taskview/kanban`), extracts the view name (`kanban`), looks it up in a static mapping to get the Taskview route (`/:orgSlug/:projectId/kanban`), and constructs the full iframe URL.

### D5: Organization slug stored in auth state after first fetch

On login, BuildingAI fetches `/module/organizations` with the Taskview token, takes the first org's slug, and stores it in `userInfo.taskviewOrgSlug`.

### D6: Taskview token managed alongside BuildingAI token

The Taskview access token is stored in BuildingAI's auth Zustand store. The `TaskviewIframePage` reads it from the store, not from the login response. This handles token refresh scenarios where the iframe may need to be re-authenticated.

Map:
```
/console/taskview/tasks          → /{orgSlug}/{projectId}?{listId}?{taskId}
/console/taskview/kanban         → /{orgSlug}/{projectId}/kanban
/console/taskview/graph          → /{orgSlug}/{projectId}/graph
/console/taskview/sprints        → /{orgSlug}/{projectId}/sprints
/console/taskview/collaboration  → /{orgSlug}/{projectId}/collaboration
/console/taskview/integrations   → /{orgSlug}/{projectId}/integrations
/console/taskview/webhooks       → /{orgSlug}/{projectId}/webhooks
/console/taskview/messaging      → /{orgSlug}/{projectId}/messaging
/console/taskview/time-reports   → /{orgSlug}/{projectId}/time-reports (project)
/console/taskview/analytics      → /{orgSlug}/analytics
/console/taskview/global-time-reports → /{orgSlug}/time-reports
/console/taskview/settings       → /{orgSlug}/settings
/console/taskview/account        → /{orgSlug}/account
```

Note: Some views require a `projectId`. Since we default to the first organization and can't know which project, we use `default` as a placeholder that Taskview will redirect from.

## Risks / Trade-offs

- **Taskview token expiry**: Taskview uses access+refresh tokens; the iframe's access token may expire during use. Taskview's axios interceptor handles refresh automatically via `POST /module/auth/refresh/token`, so this is a non-issue — the iframe handles it internally.
- **Org/project context mismatch**: Since we use the first org and no project context, Taskview may show a "no project selected" state. This is acceptable — users can navigate within Taskview.
- **Token in URL**: The `_t` parameter exposes the Taskview token in the URL. This is the same risk as AppIframePage's existing pattern. Tokens are short-lived (access tokens typically 5-30 minutes), and the iframe source is set via `src` (not `srcdoc`), so the URL never appears in browser history for end users.

## Migration Plan

1. Deploy Taskview changes first (platform-sso endpoint, iframe headers, `_t` support)
2. Deploy BuildingAI changes (menu seeds, auth service, iframe page, routes)
3. Run menu seeder to add the new menu items
4. Existing users get the new "我的待办" menu on next login

No data migration required. New Taskview users are created on first login.
