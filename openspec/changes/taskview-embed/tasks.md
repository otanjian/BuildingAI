## 1. Taskview: Allow iframe embedding

- [x] 1.1 Remove `X-Frame-Options: SAMEORIGIN` from `web/nginx.conf`
- [x] 1.2 Configure Helmet frameguard in `api/src/App.ts` to allow BuildingAI origin
- [x] 1.3 Add BuildingAI origin to CORS allowed origins in `api/src/middlewares/cors.ts`

## 2. Taskview: Platform SSO endpoint

- [x] 2.1 Add `POST /module/auth/platform-sso` route to `api/src/tv-modules/auth/AuthRoutes.ts`
- [x] 2.2 Implement `platformSso(req, res)` in `api/src/tv-modules/auth/AuthController.ts` — validate shared secret, find-or-create user by login, return access+refresh tokens

## 3. Taskview: Frontend `_t` token consumption

- [x] 3.1 Add `consumeTokenFromUrl()` function in `web/src/` — reads `_t` query param, sets token in auth store
- [x] 3.2 Call `consumeTokenFromUrl()` in `web/src/main.ts` or `web/src/bootstrap.ts` before Vue app mounts

## 4. BuildingAI: Menu seeds

- [x] 4.1 Add "我的待办" GROUP with 13 child menu items to `packages/@buildingai/db/src/seeds/data/menu.json`

## 5. BuildingAI: Auth service — Taskview SSO

- [x] 5.1 Create `TaskviewAuthService` in `packages/api/src/modules/ai/agents/services/` (or shared module) that calls `POST http://localhost:5174/module/auth/platform-sso`
- [x] 5.2 Modify `AuthService.login()` to call TaskviewAuthService after successful login, attach `taskviewToken` and `taskviewOrgSlug` to user info response

## 6. BuildingAI: Types and store

- [x] 6.1 Add `taskviewToken?`, `taskviewOrgSlug?` fields to `UserInfo` in `packages/@buildingai/web/types/src/user.ts`
- [x] 6.2 Ensure auth store persists Taskview token fields

## 7. BuildingAI: TaskviewIframePage

- [x] 7.1 Create `packages/client/src/pages/console/taskview/index.tsx` — reads Taskview token from auth store, view name from route, builds iframe URL with `_t` parameter
- [x] 7.2 Add view-name-to-Taskview-route mapping constant in the page component

## 8. BuildingAI: Console routes

- [x] 8.1 Add static routes for all 13 Taskview views in `packages/client/src/layouts/console/index.tsx` 

## 9. Verification

- [ ] 9.1 Start Taskview, log in with existing user — verify `platform-sso` works with correct secret
- [ ] 9.2 Start BuildingAI, log in — verify menu appears and iframe loads Taskview with auto-login
- [ ] 9.3 Verify new BuildingAI user auto-creates in Taskview
- [x] 9.4 Run `tsc --noEmit` and existing tests pass (buildingAI: clean, Taskview: pre-existing unrelated errors)
