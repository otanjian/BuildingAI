# Verification evidence

Verified on 2026-08-23 (Asia/Shanghai).

## Automated checks

- App focused tests: 38 passed, 0 failed, 100 assertions. Coverage includes exact embed-marker recognition, embedded shell visibility, direct-route preservation, HTML artifact preview regression, panel-layout geometry, and session tab/file-tree helpers.
- `packages/app`: `bun typecheck` passed.
- Prettier check passed for all four touched OpenCode files.
- Targeted oxlint completed with 0 errors. The reported warnings are pre-existing in the two large shared session files; the new embed utility has no lint error.
- `git diff --check` passed in both repositories.
- `openspec validate simplify-opencode-embed-shell` passed.

## Build and runtime

- Built the workspace single binary with embedded web UI using the repository models API fixture because `models.dev` was unavailable.
- Binary version: `0.0.0-dev-202608230153`.
- Binary SHA-256: `bcbe5a9b6500be43a630354b084b891f878c3c3c39dc15326ba6949dc847b02b`.
- Confirmed `/session/status` was empty before restarting the managed runtime.
- `./start.sh restart opencode` completed successfully.
- `http://127.0.0.1:4096/global/health` returned healthy with the same version.

## Browser verification

- Verified the full BuildingAI route from the supplied screenshot at `1650 × 1116` viewport size.
- The embedded session title remained visible.
- The context/status button and overflow menu were absent.
- The native OpenCode review/file panel, its tabs, file tree, resize handle, and reserved width were absent.
- The iframe expanded from the BuildingAI content start at `x=320` to `x=1641`; no visible secondary column remained.
- Direct OpenCode route regression: context/status and overflow controls remained visible, and activating `切换审查` rendered the `审查和文件` panel.
- Persisted open review state was then checked against the embedded route; the panel remained absent while the title/content stayed available.
- Both the embedded and direct session pages reported no browser console warnings or errors during verification.

## Working-tree preservation

- Both repositories contained unrelated user changes before this work.
- No reset, checkout, clean, deletion, or broad formatter rewrite was used.
- Existing overlapping session files were edited with narrow patches; no unrelated dirty file was reverted or overwritten.
