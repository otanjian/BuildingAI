## 1. Contracts and regression tests

- [x] 1.1 Add pure client tests for latest-conversation resolution, including loading, success,
      empty, error, and direct-link behavior
- [x] 1.2 Add path-policy tests that reject nested dot-prefixed segments while preserving normal
      workspace paths
- [x] 1.3 Add file-payload tests for untrimmed text and Base64 binary download conversion
- [x] 1.4 Add OpenCode embed predicate/presentation tests covering direct-route isolation and
      structured reasoning visibility

## 2. Focused BuildingAI iframe workspace

- [x] 2.1 Remove the redundant placeholder/resizable column and render the existing
      `OpencodeIframePanel` as the sole OpenCode conversation surface without changing iframe
      source, key, or lifecycle
- [x] 2.2 Move existing parent-owned form controls into the iframe header and add a project-files
      action
- [x] 2.3 Open the existing `OpencodeWorkspacePanel` in a right-side Sheet whose open/close state
      does not resize or remount the iframe
- [x] 2.4 Implement latest-conversation resume and exactly-once empty-history draft creation with a
      retryable history error state

## 3. Workspace preview and download

- [x] 3.1 Preserve OpenCode file-content type, encoding, MIME type, and untrimmed text through the
      existing API/service contract
- [x] 3.2 Reject direct list/content requests containing dot-prefixed path segments in addition to
      existing traversal/noise filtering
- [x] 3.3 Add file-row and preview download actions using the existing authenticated content query,
      with text/Base64 Blob conversion and user feedback
- [x] 3.4 Add lightweight image preview while retaining a clear unsupported-preview/download path
      for other binary formats

## 4. OpenCode embed-only presentation

- [x] 4.1 Mark explicit BuildingAI embed routes for scoped styling without altering direct OpenCode
      routes
- [x] 4.2 Add embed-only background, text, border, sans-serif, and monospace visual tokens, and
      synchronize their color scheme from the existing iframe element
- [x] 4.3 Show native reasoning summaries in embed mode as labeled collapsible content while
      retaining native tool cards and final Markdown text

## 5. Verification

- [x] 5.1 Run focused BuildingAI client/API tests and type checks for changed modules
- [x] 5.2 Run focused OpenCode app/session-ui tests and type checks, then rebuild the managed
      OpenCode web/runtime artifact
- [x] 5.3 Browser-verify available latest-session, stable iframe, file, and embed-theme flows; cover
      unavailable empty-history and structured-output fixtures with deterministic tests
- [x] 5.4 Validate the OpenSpec change and record verification evidence

## Verification evidence

- BuildingAI client: 25 test files / 112 tests passed; focused ESLint and TypeScript checks passed;
  production web build passed.
- BuildingAI API: 4 focused workspace/file suites / 41 tests passed; TypeScript check passed.
- OpenCode: 3 embed tests and 2 focused file HTTP scenarios passed; app, session-ui, and server type
  checks passed.
- Runtime: OpenCode Web and the current-platform embedded runtime rebuilt successfully using the
  repository's checked-in model snapshot, smoke-tested, and restarted on port 4096.
- Browser: `/agents/:id/chat` resumed the first updatedAt-descending conversation, rendered one
  iframe, kept the same iframe `src` while opening the project-file Sheet, hid dot-prefixed entries,
  previewed an image, copied its relative path, and initiated download with success feedback. With
  an OS-light/BuildingAI-dark mismatch, the existing iframe element resolved to `color-scheme:
  dark` and OpenCode applied its dark/Inter embed tokens; direct OpenCode remained light, retained
  its titlebar, and had no embed marker. The project-file Sheet's intended wide preview layout
  overrode the shared component's narrow default.
- The available agent history contained no empty-history OpenCode agent and no live
  reasoning-bearing session; those branches are covered by deterministic resolver/embed tests. The
  resumed legacy conversation referenced a previously removed OpenCode session, which correctly
  displayed OpenCode's existing missing-session state without changing the iframe contract.
