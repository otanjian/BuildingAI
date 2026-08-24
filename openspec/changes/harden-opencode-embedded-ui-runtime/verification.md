# Verification

Verified on 2026-08-23 in the current dirty BuildingAI and sibling OpenCode worktrees without reset,
stash, commit, or removal of unrelated changes.

## Runtime evidence

- Managed version: `0.0.0-dev-202608231344`
- Binary SHA-256: `1e671c3843d36cd0ef4f73b9dcb390335ee5cf9c0026da73cd19e9936c760607`
- Runtime-source SHA-256: `6b55fbc9aa6f31cff7d6eb835d84ed29d69018355ded4d23ec3a796c97d4629b`
- Health: `{"healthy":true,"version":"0.0.0-dev-202608231344"}`
- Idempotent start: PID remained `85845` before and after `./start.sh start opencode`
- Active sessions were `{}` before the managed restart.

The runtime was built through `./scripts/build-opencode-runtime.sh`, attested, validated before the
old service was stopped, and then started through `./start.sh restart opencode`.

## Automated verification

- `bash scripts/start-sh-opencode.test.sh`
- `bash scripts/start-sh-process-status.test.sh`
- `bash -n start.sh`
- `bash -n scripts/build-opencode-runtime.sh`
- `openspec validate harden-opencode-embedded-ui-runtime`
- `git diff --check`
- From the sibling OpenCode `packages/app` directory:
  - `bun test --conditions=solid --preload ./happydom.ts ./src/utils/buildingai-embed.test.ts ./src/utils/html-artifact-preview.test.ts`
    (27 passed, 0 failed)
  - `bun typecheck`
  - `bunx prettier --check index.html src/utils/buildingai-embed.test.ts src/utils/buildingai-embed.ts src/pages/session.tsx src/pages/session/timeline/message-timeline.tsx`

## Browser verification

On the representative BuildingAI agent/session route, the iframe source retained
`buildingaiEmbed=1` and the iframe contained one `main`, zero `banner` elements, and zero exact
`审查` text matches. On the same OpenCode session route without the embed query, the normal `DEV`
banner, session links, `新建会话`, and `切换审查` were present.
