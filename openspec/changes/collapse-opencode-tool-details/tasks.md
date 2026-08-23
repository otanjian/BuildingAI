## 1. Regression tests and policy

- [x] 1.1 Extend the OpenCode `partDefaultOpen` tests to cover shell, write, edit, patch, and
      generic expandable-tool defaults when the embed policy is collapsed, while preserving
      direct-route expanded settings.
- [x] 1.2 Add or update an embed-policy helper test proving only the exact `buildingaiEmbed=1` marker
      applies the collapsed default.

## 2. Timeline implementation

- [x] 2.1 Pass embed-aware shell/edit defaults through the existing OpenCode timeline boundary so
      specialized tool renderers receive `defaultOpen=false` in the BuildingAI embed.
- [x] 2.2 Verify the existing `BasicTool` disclosure remains clickable and keyboard accessible for
      shell, write, edit, and patch bodies, including deferred streaming content.

## 3. Verification and delivery

- [x] 3.1 Run focused OpenCode session-ui/app tests and package type checks.
- [x] 3.2 Rebuild the managed OpenCode web/runtime artifact and manually verify collapsed headers and
      click-to-expand behavior in the BuildingAI iframe; record evidence.
- [x] 3.3 Validate this OpenSpec change and mark all completed tasks.

## Verification evidence

- `packages/session-ui`: `bun test ./src/components/part-default-open.test.ts ./src/components/message-part.test.ts` — 13 tests passed; `bun typecheck` passed.
- `packages/app`: focused `buildingai-embed.test.ts` — 4 tests passed; `bun typecheck` passed.
- OpenCode runtime build portion: `MODELS_DEV_API_JSON=packages/opencode/test/tool/fixtures/models-api.json bun run build --single --skip-install` — Vite embed build and macOS arm64 binary smoke test passed (`0.0.0-dev-202608221204`).
- Deployment: `./start.sh restart opencode` replaced PM2 `opencode-serve` with the rebuilt workspace binary; health reports `0.0.0-dev-202608221204` on `127.0.0.1:4096`.
- Browser smoke: BuildingAI conversation iframe at `127.0.0.1:4091/.../c/978f4ba2-3f8f-4760-b1bc-1c6c3f122d93` showed Shell and file-edit tool triggers with `aria-expanded="false"`; clicking a Shell trigger and pressing `Enter` on another changed the trigger to `aria-expanded="true"` and exposed the existing `data-slot="collapsible-content"` body.
- `openspec validate collapse-opencode-tool-details --strict` passed.
