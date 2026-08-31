# Verification evidence

Verified on 2026-08-23 (Asia/Shanghai).

## Automated checks

- App tests: 30 passed, 0 failed, 1,045 assertions. This includes HTML path validation, embed-only behavior, preview isolation/CSP, loading and failure pages, popup reservation, workspace reads, Blob navigation and cleanup, and locale parity.
- Session UI tests: 10 passed, 0 failed, 44 assertions. This includes inline path decoration, click activation, Enter/Space keyboard activation, ignored keys, and unchanged behavior without an action hook.
- `packages/app`: `bun typecheck` passed.
- `packages/session-ui`: `bun typecheck` passed.
- Prettier check passed for all touched app and session UI files.
- Targeted oxlint completed with 0 errors. It reported 77 warnings in the existing large shared files; no warning blocks the build or typecheck.
- `git diff --check` passed.
- `openspec validate opencode-html-artifact-preview` passed.

## Build and runtime

- Built the workspace single binary with embedded web UI using the repository's models API fixture because `models.dev` was unavailable.
- Binary: `packages/opencode/dist/opencode-darwin-arm64/bin/opencode`
- Version: `0.0.0-dev-202608230122`
- SHA-256: `95c1c241cb315ac43b43d22ad882ddea9c5aa0639b8217a394e5ca362872c7dc`
- Waited until `/session/status` returned no active sessions before restarting the managed OpenCode process.
- `./start.sh restart opencode` completed successfully.
- `http://127.0.0.1:4096/global/health` returned healthy with version `0.0.0-dev-202608230122`.

## Browser verification

- The representative embedded session displayed the assistant reply HTML path as an accessible button.
- The changed-file HTML row displayed a separate preview button next to the existing diff trigger.
- Clicking the changed-file preview left the diff trigger at `aria-expanded="false"` before and after the click.
- On the isolated pre-deployment runtime, both entry points opened the representative ECharts report in a Blob-backed tab with the expected report title. The changed-file path with the `sapwork/` project prefix resolved against the active workspace correctly.
- The representative report was previously verified to render its ECharts charts with the approved jsDelivr dependency. The new preview policy explicitly permits only that CDN while blocking connections, forms, frames, objects, workers, and top-level navigation.
- Failure presentation and popup-blocked behavior are covered by the focused lifecycle tests. The final external Chrome connection became unavailable after the managed restart, so the already completed Blob-tab verification was retained; no alternate browser-control or `blob:` inspection workaround was used.
- The embedded session page reported no console warnings or errors during the final 4096 verification.

## Working-tree preservation

- Both repositories already contained unrelated user changes before this work.
- No reset, checkout, clean, or destructive rewrite was used.
- Existing overlapping files were edited with narrow patches. The temporary BuildingAI iframe sandbox experiment was reverted, and `packages/client/src/components/agent-chat/opencode-iframe-panel.tsx` has no diff from this change.
