## 1. Master Channel Contract

- [x] 1.1 Add failing shell tests for master and non-master binary version validation.
- [x] 1.2 Add failing shell tests that readiness and runtime reuse reject a non-master live version.

## 2. Launcher Enforcement

- [x] 2.1 Add an isolated master-version predicate and enforce it during binary integrity preflight.
- [x] 2.2 Enforce the same predicate against the live health version before readiness and reuse.
- [x] 2.3 Provide actionable diagnostics when a non-master runtime is selected or served.
- [x] 2.4 Pin the controlled OpenCode build wrapper to compile the master channel.

## 3. Verification

- [x] 3.1 Run shell syntax and OpenCode launcher contract tests.
- [x] 3.2 Validate the OpenSpec change and confirm the currently managed runtime is master.
