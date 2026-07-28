## 1. Backend public access for artifacts

- [x] 1.1 Add `@AgentPublicAccess` to conversation artifact GET so publish Bearer works like other public Agent routes
- [x] 1.2 Smoke-check ownership still rejects cross-conversation / wrong token

## 2. Client auth blob preview

- [x] 2.1 Add helper to resolve absolute artifact fetch URL and auth headers (JWT / publish token / anonymous id)
- [x] 2.2 Implement hook or effect: auth fetch → blob URL → revoke on change/unmount; loading + error states
- [x] 2.3 Wire `MessageArtifacts` / `WebPreview` to use blob URL for iframe body while keeping original URL visible in chrome
- [x] 2.4 Unit tests for URL/header helper and extractHtmlArtifacts behavior
- [x] 2.5 Prefer publish accessToken on site-chat over session JWT; never treat workspace path segments as tokens
- [x] 2.6 Keep WebPreview `defaultUrl` empty so iframe never loads the unauthenticated artifact API path
- [x] 2.7 Hide artifact API path chrome (`WebPreviewUrl`) in chat preview; keep title +「打开报告」only

## 3. Verification

- [x] 3.1 Manual or scripted check: with Bearer, fetch returns HTML; without Bearer, unauthorized
- [x] 3.2 Lint/typecheck touched client (and API if changed) files
- [x] 3.3 Rebuild/deploy client so site-chat no longer iframes the artifact API URL directly

## 4. Open report link + auto-open

- [x] 4.1 Add session-scoped auto-open helpers (mark / should-open) with unit tests
- [x] 4.2 Add「打开报告」control that opens the ready blob URL in a new tab
- [x] 4.3 On first ready per artifact URL in the session, attempt auto-open once; keep button if blocked
