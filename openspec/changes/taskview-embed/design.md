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

### D4: TaskviewIframePage uses useLocation to determine the Taskview view

The page reads the current URL path (e.g., `/console/taskview/kanban`) using `useLocation().pathname`, extracts the view segment after `/console/taskview/`, looks it up in a static mapping to get the Taskview route (`/{orgSlug}/default/kanban`), and constructs the full iframe URL.

**Why not `useParams()`** (original design): The `generateRoutes` function in the console layout creates exact routes (e.g., `taskview/tasks`) from the dynamic menu data. These exact routes shadow the wildcard `taskview/*` route, causing `useParams()` to return empty — the wildcard parameter is never captured. `useLocation` avoids this by parsing the actual URL path directly.

### D7: In-page secondary tab navigation

The `TaskviewIframePage` includes its own tab bar below the BuildingAI top nav, mirroring the 13 sidebar menu items. This lets users switch Taskview views without returning to the sidebar — critical because the sidebar collapses on narrow viewports and the Taskview iframe has its own internal navigation.

### D8: Taskview base URL via environment variable

The Taskview server URL is read from `VITE_TASKVIEW_BASE_URL` env var at build time, defaulting to `http://localhost:5174` for local development. This avoids hard-coding the URL and supports different environments (dev/staging/prod).

### D9: Iframe URL must preserve the base URL path prefix

Route paths in the view map start with `/` (e.g. `/{orgSlug}/default`). `new URL(absolutePath, base)` resolves against the host root and **silently drops** any path prefix on the base URL. With `VITE_TASKVIEW_BASE_URL=https://ai.bosofts.com/taskview-web`, the iframe loaded `https://ai.bosofts.com/org-.../default` — BuildingAI's own SPA instead of Taskview. That nested SPA initialized an empty auth state and wrote `{"auth":{}}` to the shared localStorage, whose `storage` event was merged back by the parent's persist-sync listener, clearing the parent session and redirecting to `/login`.

Fix: `resolveTaskviewUrl(baseUrl, routePath)` (in `taskview-url.ts`) normalizes the base to end with `/` and strips the leading `/` from the route path before `new URL()`, producing `<base>/<routePath>` in all environments. Covered by unit tests (production base with prefix, trailing slash, bare-origin dev base).

### D10: Pass Taskview refresh token into the iframe (`_r`)

The Taskview access token expires (~24h). Without a refresh token, the Taskview axios interceptor fails to renew, invalidates tokens and redirects to its login page — so users get "kicked out" of 我的待办.

Fix: `TaskviewAuthService` returns the `refresh` token from `POST /module/auth/platform-sso`; it is exposed as `userInfo.taskviewRefreshToken` and passed to the iframe via a `_r` base64 query param (alongside `_t`). Taskview's bootstrap consumes `_r` with `$ls.setRefreshToken()`, so the iframe can renew its access token without re-login.

### D11: Keep the iframe mounted; navigate via postMessage

Every view switch used to change the iframe `src`, forcing a full SPA reload of Taskview. Now:

- The iframe `src` is built once from the view pinned on first mount, plus `_t`/`_r` tokens.
- Switching tabs updates the BuildingAI URL (for shareability) and posts `{ type: "parent-navigate", path }` to the iframe (same protocol as `AppIframePage`).
- Taskview listens for `parent-navigate` and calls `router.push(path)` internally.
- After the iframe loads, BuildingAI syncs the current URL view into the iframe to cover back/forward and deep links.

### D12: Hide admin tabs in the top bar

The top tab bar shows 8 work views only: 任务列表/看板/图表/冲刺/协作/项目时间报告/分析/时间报告. Admin views (账号, 设置, 集成, Webhooks, 消息) are hidden from the tabs but remain in the route map so sidebar menu items and deep links still work.

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

## Implementation Status (2025-08-01)

### BuildingAI Side — Complete

| Component | File | Status |
|-----------|------|--------|
| Menu seeds | `menu.json` — 我的待办 GROUP + 13 children | ✅ |
| TaskviewAuthService | `taskview-auth.service.ts` | ✅ |
| UserInfo types | `web/types/src/user.ts` | ✅ |
| TaskviewIframePage | `console/taskview/index.tsx` | ✅ |
| Console routes | `layouts/console/index.tsx` — `taskview/*` | ✅ |
| Main router | `router/index.tsx` — `/taskview/*` | ✅ |
| View name extraction | uses `useLocation` instead of `useParams` | ✅ |
| Secondary tab nav | in-page Tabs component for 13 views | ✅ |
| Configurable URL | `VITE_TASKVIEW_BASE_URL` env var | ✅ |

### Taskview Side — Pending

These are marked complete in tasks.md but the code was never committed:

| # | File | Change Needed | Code Exists? |
|---|------|---------------|--------------|
| 1.1 | `web/nginx.conf` | Remove `X-Frame-Options: SAMEORIGIN` | ❌ |
| 1.2 | `api/src/App.ts` | `helmet({ frameguard: false })` | ❌ |
| 1.3 | `api/src/middlewares/cors.ts` | Add BuildingAI origin via env var | ⚠️ depends on `CORS_ALLOWED_ORIGINS` |
| 2.1 | `api/src/tv-modules/auth/AuthRoutes.ts` | Add `POST /platform-sso` route | ❌ |
| 2.2 | `api/src/tv-modules/auth/AuthController.ts` | Add `platformSso()` method | ❌ |
| 3.1 | `web/src/` | Add `consumeTokenFromUrl()` — read `_t`, set token | ❌ |
| 3.2 | `web/src/main.ts` | Call `consumeTokenFromUrl()` before mount | ❌ |

### Impact of Missing Taskview Code

The full error chain:

1. BuildingAI login → `TaskviewAuthService.getSession()` calls `POST /module/auth/platform-sso` → **404 (route doesn't exist)**
2. `getSession()` catches error, returns `null`
3. `taskviewToken = ""`, `taskviewOrgSlug = ""`
4. User clicks any 我的待办 item → `TaskviewIframePage` renders "无法连接到我的待办。请尝试重新登录。"
5. Even if tokens existed, Helmet blocks the iframe and Taskview web doesn't consume `_t`

## Migration Plan

1. Deploy Taskview changes first (platform-sso endpoint, iframe headers, `_t` support)
2. Deploy BuildingAI changes (menu seeds, auth service, iframe page, routes)
3. Run menu seeder to add the new menu items
4. Existing users get the new "我的待办" menu on next login

No data migration required. New Taskview users are created on first login.
