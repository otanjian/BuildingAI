## 1. BuildingAI embed and prompt context

- [x] 1.1 Add failing tests for credential-free BuildingAI report-base construction and embed URL propagation.
- [x] 1.2 Implement request-origin-aware report-base propagation for the active Agent conversation.
- [x] 1.3 Add failing prompt tests, then require both durable and legacy OpenCode turns to cite concrete HTML report files.

## 2. Authenticated BuildingAI report viewer

- [x] 2.1 Add failing client tests for report-route path resolution and authenticated artifact loading behavior.
- [x] 2.2 Extract the existing authenticated Blob loader for reuse without regressing message artifact previews.
- [x] 2.3 Add the authenticated report route with isolated rendering and explicit loading/error states.

## 3. Embedded OpenCode navigation

- [x] 3.1 Add failing OpenCode tests for report-base parsing, artifact-relative normalization, traversal rejection, and URL construction.
- [x] 3.2 Route eligible embedded reply paths and changed-file actions to the BuildingAI report URL while retaining the current Blob fallback.
- [x] 3.3 Rebuild the managed OpenCode runtime so the embedded bundle includes the navigation behavior.

## 4. Verification

- [x] 4.1 Run focused API, client, and OpenCode tests plus relevant typechecks/builds.
- [x] 4.2 Validate the OpenSpec change and verify a report opens from embedded OpenCode on BuildingAI port `4091` with failure behavior intact.

## 5. Filename-only report completion references

- [x] 5.1 Add a failing prompt test requiring generated HTML reports to be cited by filename only, without a directory or absolute path.
- [x] 5.2 Update the shared OpenCode report instruction used by embedded, durable, and legacy turns.
- [x] 5.3 Run focused API tests and validate the updated OpenSpec change.
