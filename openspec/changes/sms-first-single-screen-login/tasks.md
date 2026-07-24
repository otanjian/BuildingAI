## 1. Helpers and mode logic

- [x] 1.1 Extract mobile detection + login mode resolution helpers (pure functions) for SMS-first defaults and progressive switching
- [x] 1.2 Add unit tests for mode defaults, mobile heuristic, and passwordPreferred sticky toggle

## 2. Login form UI

- [x] 2.1 Refactor `login-form.tsx` to a single login screen with `mode: sms | password` (remove ACCOUNT_INPUT / PASSWORD / VERIFICATION_CODE page steps)
- [x] 2.2 Wire account field always visible; SMS fields default when phone enabled; password via expandable toggle; submit via login / smsLogin without checkAccount gate
- [x] 2.3 Preserve WeChat dialog, policy agreement, redirect, and separate REGISTER mode

## 3. Verification

- [x] 3.1 Run unit tests for mode helpers and fix failures
- [x] 3.2 Typecheck / lint the touched client login files
