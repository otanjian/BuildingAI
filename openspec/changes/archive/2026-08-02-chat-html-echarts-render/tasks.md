## 1. Dependencies and option helpers

- [x] 1.1 Add `echarts` dependency to `@buildingai/web/ui` (catalog) if missing
- [x] 1.2 Implement option parse/validate helper (JSON object only; reject executable formatter/function string patterns) with unit tests for valid/invalid cases

## 2. ECharts block UI

- [x] 2.1 Implement `EchartsBlock` (lazy `import('echarts')`, init/setOption, ResizeObserver, dispose on unmount, loading/error states)
- [x] 2.2 Wire `CollapsibleMarkdownCode` to render `EchartsBlock` for complete `echarts` / `echarts-json` fences; incomplete fences must not init charts; invalid options fall back to code block
- [x] 2.3 Confirm `MessageResponse` and reasoning Streamdown paths both use the shared markdown `code` components (no divergent behavior)

## 3. HTML rendering verification

- [x] 3.1 Document/verify current Streamdown sanitize behavior with sample safe HTML (table/spans) in assistant messages
- [x] 3.2 Verify `<script>` and inline event handlers are not executed; adjust allowlist only if safe tags needed for agreed samples are stripped

## 4. Verification

- [x] 4.1 Manual check: stream a message with incomplete then complete ` ```echarts ` fence; chart appears only when complete
- [x] 4.2 Manual check: invalid JSON fence shows code fallback; safe HTML sample renders; script sample does not execute
- [x] 4.3 Run package lint/typecheck (or targeted tests) for touched `@buildingai/web/ui` files and fix regressions
