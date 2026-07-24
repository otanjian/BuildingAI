## Why

The web login form currently uses a multi-step wizard (account → password or SMS). Most users sign in with phone SMS, so the extra “下一步” click adds friction without adding value. We should present account, SMS code, and password on one screen, with SMS as the default path.

**Why now:** Product decided to merge the account and credential steps and keep verification-code login on the same screen, using SMS-first progressive disclosure.

## What Changes

- Replace the account → password / verification-code page steps with a **single login screen**.
- Default to **SMS mode** when phone login is enabled; password is a secondary expandable option.
- Auto-switch to password fields when the account input looks like username/email (not a mobile number).
- Keep register as a separate in-card mode (unchanged scope).
- Stop using `checkAccount` as a blocking “next step” gate; login/SMS APIs handle success and errors.
- No API contract changes required for login/SMS endpoints.

## Non-goals

- Redesigning WeChat login, OAuth callback, or console login settings UI.
- Merging register into the primary login fields.
- Removing or redesigning `checkAccount` backend endpoint (may become unused by the form).
- Changing default login-method server config values.

## Capabilities

### New Capabilities

- `web-login-ui`: Single-screen, SMS-first web login form behavior (modes, field visibility, submit paths).

### Modified Capabilities

- (none)

## Impact

- Frontend: `packages/client/src/pages/login/_components/login-form.tsx` (primary).
- Auth services already used: `useLoginMutation`, `useSmsLoginMutation`, `useSendSmsCodeMutation`; `useCheckAccountMutation` may be removed from the form.
- User-visible login UX; no Nest API / DB schema change expected.
