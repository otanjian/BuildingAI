## Context

Web login lives in `packages/client/src/pages/login/_components/login-form.tsx`. Today it uses `PageEnum` steps: `ACCOUNT_INPUT` → `PASSWORD` or `VERIFICATION_CODE`, gated by `POST /auth/check-account`. Register remains a separate step. Login methods are driven by `websiteConfig.loginSettings` (`ACCOUNT`, `PHONE`, `WECHAT`).

Product decision: one login screen, SMS-first progressive disclosure, password as secondary expandable option. Register stays separate.

## Goals / Non-Goals

**Goals:**

- Single login form for account + SMS code + password (mode-based fields).
- Default `mode = sms` when phone login is enabled; otherwise `password`.
- Heuristic: mobile-shaped input → prefer SMS fields; username/email → password fields.
- Collapsible “使用密码登录” / “使用验证码登录” toggles within the same card.
- Remove blocking “下一步” / `checkAccount` from the happy path.
- Preserve WeChat dialog, policy agreement, redirect, and register mode.

**Non-Goals:**

- Backend auth API redesign.
- Console login-settings page changes.
- Merging register into the login field set.

## Decisions

### 1. Collapse three login steps into `mode: "sms" | "password"`

- **Choice:** Keep one card; switch visible credential fields by `mode`. Account input always visible.
- **Alternatives:** Keep wizard (rejected — friction); tabs always both visible (heavier UI).
- **Rationale:** Matches SMS-majority usage with minimal chrome.

### 2. Default mode and auto-switch

- If `allowPhoneLogin`: initial `mode = "sms"`.
- Else if `allowAccountLogin`: initial `mode = "password"`.
- On account change: if value matches CN mobile regex and phone login allowed → `mode = "sms"` (unless user explicitly chose password for this mobile session via toggle).
- If value does not look like mobile and account login allowed → `mode = "password"`.
- Track `passwordPreferred` boolean so choosing “使用密码登录” on a mobile number is sticky until account cleared or user switches back.

### 3. Drop `checkAccount` from the form

- Submit password path → `login({ username: account, password })`.
- SMS path → `sendSmsCode` / `smsLogin` with mobile = account.
- **Alternatives:** blur precheck for hints only (deferred); keep next-step gate (rejected).
- **Rationale:** One less round-trip; APIs already return actionable errors.

### 4. UI copy / layout

- Title: “欢迎回来”; description SMS-first when phone enabled.
- SMS block: code input + “获取验证码” + countdown.
- Password: shown when `mode === "password"`; link toggle when both methods available.
- Policy checkbox above primary submit on both modes.
- WeChat + separator unchanged on the login card.

### 5. Register

- Remain `page === REGISTER` alternate content; link from login footer.

## Risks / Trade-offs

- **[Risk]** Without `checkAccount`, users with password-less phone accounts may try password first → Mitigation: SMS default for mobile; clear API errors; easy toggle back to SMS.
- **[Risk]** Account enumeration via old check endpoint still exists server-side → Mitigation: out of scope; form simply stops calling it.
- **[Trade-off]** Heuristic mobile detection can misclassify edge accounts → rare; user can toggle mode.

## Migration Plan

- Frontend-only deploy; no migration.
- Rollback: revert `login-form.tsx` (and any extracted helpers).

## Open Questions

- None blocking; register-on-SMS for unknown mobile remains backend behavior of `smsLogin` / register settings.
