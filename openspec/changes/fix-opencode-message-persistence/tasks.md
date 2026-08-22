## 1. Regression coverage

- [x] 1.1 Add a failing unit test for recursive removal of PostgreSQL-invalid control characters while preserving valid whitespace and nested message structure.
- [x] 1.2 Add a failing persistence-boundary test proving a NUL-containing assistant response is sanitized before `createMessage` and terminal metadata remains terminal.

## 2. Implementation

- [x] 2.1 Implement the pure recursive message sanitizer and apply it after sensitive-word projection at the assistant persistence boundary.
- [x] 2.2 Add guarded `persist_failed` terminal handling for unexpected assistant-write errors without logging message content or credentials.

## 3. Verification

- [x] 3.1 Run focused API tests, typecheck, lint, and OpenSpec validation; inspect the diff for unrelated changes.
