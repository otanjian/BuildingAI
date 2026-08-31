## 1. Context construction (TDD)

- [x] 1.1 Add failing unit tests for account/personal-parameter formatting, secret-key masking, sensitive-word replacement, size bounds, and empty context
- [x] 1.2 Implement the sanitized OpenCode session-context utility
- [x] 1.3 Add the authenticated embed-session controller wiring and metadata update tests

## 2. OpenCode runtime integration (TDD)

- [x] 2.1 Add a failing OpenCode runner test proving session metadata context is appended to system instructions
- [x] 2.2 Implement optional metadata-context injection in the OpenCode runner
- [x] 2.3 Rebuild the managed OpenCode 1.18.19 binary without changing its configuration files

## 3. Verification

- [x] 3.1 Run focused API and OpenCode tests plus API/client type checks
- [x] 3.2 Restart the local stack and browser-test a new SAP OpenCode session
- [x] 3.3 Validate this OpenSpec change and mark all tasks complete
