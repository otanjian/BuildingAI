## 1. Regression coverage

- [x] 1.1 Add a focused failing test for in-progress versus completed reasoning-label selection.
- [x] 1.2 Record the required pre-change production timeline benchmark baseline.

## 2. Lifecycle label implementation

- [x] 2.1 Add the typed completed-reasoning i18n key and Chinese translations.
- [x] 2.2 Render the embed reasoning summary from the existing assistant completion signal while
      preserving direct-route presentation and disclosure behavior.

## 3. Verification and delivery

- [x] 3.1 Run focused session-ui tests, package type checks, and the post-change timeline benchmark
      comparison.
- [x] 3.2 Build the managed OpenCode runtime/web bundle and verify both completed and live labels in
      a mocked BuildingAI iframe route, then deploy through the managed OpenCode-only restart and
      verify the reported real iframe session.
- [x] 3.3 Validate the OpenSpec change and record verification evidence.

## Verification evidence

- Regression-first: `bun test ./src/components/reasoning-status.test.ts` initially failed because
  `reasoning-status` did not exist, then passed after implementation.
- `packages/session-ui`: focused reasoning/message-part tests passed (8 tests); `bun typecheck`
  passed.
- `packages/ui`: `bun typecheck` passed.
- `packages/app`: `bun typecheck` passed; mocked-browser regression passed and proved direct routes
  have no embed disclosure, completed reasoning says `思考完成` and is collapsed, and live reasoning
  says `思考中` and is expanded.
- Production timeline benchmark (24 deltas, 48 history turns, minimal diagnostics): baseline and
  post-change runs passed; both reported zero long tasks, zero RAF gaps over 33 ms, no row/markdown
  replacement, and all deltas delivered.
- Managed runtime build: `MODELS_DEV_API_JSON=test/tool/fixtures/models-api.json bun run build
  --single --skip-install` passed web build and binary smoke test as
  `0.0.0-dev-202608230701`.
- Deployment: `./start.sh restart opencode` restarted only `opencode-serve`; BuildingAI API and web
  remained online.
- Real iframe smoke: after reload, the reported BuildingAI conversation exposed five reasoning
  summaries, all labeled `思考完成`, and all five disclosures had `open=false`.
