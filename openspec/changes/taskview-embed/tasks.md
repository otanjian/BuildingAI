## 1. Taskview: Allow iframe embedding

- [x] 1.1 Remove `X-Frame-Options: SAMEORIGIN` from `web/nginx.conf`
- [x] 1.2 Configure Helmet frameguard in `api/src/App.ts` to allow BuildingAI origin
- [x] 1.3 Add BuildingAI origin to CORS allowed origins in `api/src/middlewares/cors.ts`

## 2. Taskview: Platform SSO endpoint

- [x] 2.1 Add `POST /module/auth/platform-sso` route to `api/src/tv-modules/auth/AuthRoutes.ts`
- [x] 2.2 Implement `platformSso(req, res)` in `api/src/tv-modules/auth/AuthController.ts` — validate shared secret, find-or-create user by login, return access+refresh tokens

## 3. Taskview: Frontend `_t` token consumption

- [x] 3.1 Add `consumeTokenFromUrl()` function in `web/src/` — reads `_t` query param, sets token in auth store
- [x] 3.2 Call `consumeTokenFromUrl()` in `web/src/main.ts` or router entry before Vue app mounts

## 4. BuildingAI: Menu seeds

- [x] 4.1 Add "我的待办" GROUP with 13 child menu items to `packages/@buildingai/db/src/seeds/data/menu.json`

## 5. BuildingAI: Auth service — Taskview SSO

- [x] 5.1 Create `TaskviewAuthService` in `packages/api/src/common/modules/auth/services/` that calls `POST /module/auth/platform-sso`
- [x] 5.2 Modify `UserController.getUserInfo()` to call `taskviewAuthService.getSession()` after successful login, attach `taskviewToken` and `taskviewOrgSlug` to user info response

## 6. BuildingAI: Types and store

- [x] 6.1 Add `taskviewToken?`, `taskviewOrgSlug?` fields to `UserInfo` in `packages/@buildingai/web/types/src/user.ts`
- [x] 6.2 Ensure auth store persists Taskview token fields

## 7. BuildingAI: TaskviewIframePage

- [x] 7.1 Create `packages/client/src/pages/console/taskview/index.tsx` — reads Taskview token from auth store, view name from URL path via useLocation, builds iframe URL with `_t` parameter
- [x] 7.2 Add view-name-to-Taskview-route mapping constant in the page component
- [x] 7.3 Add in-page secondary tab navigation (Tabs component) for switching between Taskview views without sidebar
- [x] 7.4 Read Taskview base URL from `VITE_TASKVIEW_BASE_URL` env var (default: `http://localhost:5174`)

## 8. BuildingAI: Console routes

- [x] 8.1 Add static routes for all 13 Taskview views in `packages/client/src/layouts/console/index.tsx` 

## 9. BuildingAI: Main router

- [x] 9.1 Add `/taskview/*` route in `packages/client/src/router/index.tsx`

## 10. Verification

- [x] 10.1 Start Taskview, verify `platform-sso` works with correct secret
- [x] 10.2 Start BuildingAI, log in — verify menu appears and iframe loads Taskview with auto-login
- [x] 10.3 Verify new BuildingAI user auto-creates in Taskview
- [x] 10.4 Run `tsc --noEmit` for BuildingAI (clean)

## 11. Bugfix: viewName extraction

- [x] 11.1 Fix `useParams()` failing to capture wildcard because exact routes shadow `taskview/*` — switched to `useLocation().pathname` parsing (design D4 update)

## 12. Bugfix: iframe URL drops Taskview base path (production)

- [x] 12.1 Root cause: `new URL(path, base)` with an absolute route path (`/{orgSlug}/default`) resolves against the host root, silently dropping the base URL's path prefix (`/taskview-web`). The iframe loaded BuildingAI's own SPA instead of Taskview; that nested SPA wrote an empty `auth` to shared localStorage, which the parent's persist-sync `storage` listener merged back, clearing the parent session and bouncing to `/login`.
- [x] 12.2 Extract `resolveTaskviewUrl(baseUrl, routePath)` into `packages/client/src/pages/console/taskview/taskview-url.ts` — normalizes base to end with `/` and strips the leading `/` from the route path.
- [x] 12.3 Unit tests in `taskview-url.spec.ts` covering production base with path prefix, trailing-slash base, bare-origin dev base, and nested routes (5 passing).
- [x] 12.4 Use `resolveTaskviewUrl` in `TaskviewIframePage.iframeSrc` memo.
- [x] 12.5 Declare `VITE_TASKVIEW_BASE_URL` in `turbo.json` globalEnv.
- [x] 12.6 Verified: `tsc --noEmit` clean, eslint clean, 5/5 tests pass.

## 13. Production UX: auto-login, fast iframe switching, hidden admin tabs

- [x] 13.1 Root cause of "重新登录": `TaskviewAuthService.getSession()` only returned the Taskview `access` token and dropped `refresh`. Once the access token expires (~24h), the Taskview axios interceptor tries to refresh, finds no refresh token, invalidates tokens and routes to `/login`.
- [x] 13.2 Root cause of "打开慢": the iframe `src` changes on every view switch, forcing a full SPA reload of Taskview for every tab click; production also serves Taskview via Vite dev server (deployment concern, not fixed in this repo).
- [x] 13.3 Backend: `TaskviewAuthService` returns `taskviewRefreshToken`; `UserInfo` adds `taskviewRefreshToken?`; `user.controller.ts` returns it.
- [x] 13.4 Frontend: `TaskviewIframePage` passes refresh token via `_r` query param and keeps the iframe mounted, switching views with `parent-navigate` postMessage instead of changing `src`.
- [x] 13.5 Hide admin tabs: remove `account`, `settings`, `integrations`, `webhooks`, `messaging` from `TASKVIEW_TABS`.
- [x] 13.6 Taskview side: `bootstrap.ts` consumes `_r` (sets refresh token) and listens for `parent-navigate` messages to drive its router.
- [x] 13.7 Tests for iframe src builder (`_t`/`_r` params, base path preserved), route path mapping, and visible-tabs list (17 passing).
