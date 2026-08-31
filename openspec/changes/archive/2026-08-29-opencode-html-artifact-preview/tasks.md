## 1. Preview domain and security boundary

- [x] 1.1 Add failing unit tests for case-insensitive HTML path recognition, query/hash stripping, and non-HTML/direct-route exclusions
- [x] 1.2 Add failing unit tests for the trusted preview shell, sandbox flags, restrictive CSP, escaped metadata/errors, approved CDN policy, and unsupported-relative-resource notice
- [x] 1.3 Implement workspace HTML validation and the isolated preview-shell builder without new runtime dependencies

## 2. Embedded conversation entry points

- [x] 2.1 Add failing component/domain coverage for embed-only assistant inline-path activation and keyboard semantics
- [x] 2.2 Extend markdown path decoration with optional action hooks and wire the embedded session timeline to the shared HTML preview action
- [x] 2.3 Add a distinct HTML preview control to changed-file summary rows without changing accordion diff behavior
- [x] 2.4 Add localized accessible labels, loading/failure presentation, and embed-only interaction styles

## 3. Browser opening lifecycle

- [x] 3.1 Add failing tests for synchronous tab reservation, opener removal, workspace file reads, text/HTML validation, success navigation, failure rendering, and Blob URL cleanup
- [x] 3.2 Implement the user-initiated loading-tab to isolated-preview lifecycle through the directory-scoped OpenCode SDK

## 4. Verification and deployment

- [x] 4.1 Run focused OpenCode unit tests and package typecheck/lint for all touched app and session UI code
- [x] 4.2 Validate the OpenSpec change and build the workspace OpenCode single binary with its embedded web UI
- [x] 4.3 Restart the OpenCode runtime and browser-verify reply-path preview, changed-file preview, diff preservation, failure state, and representative ECharts report rendering
- [x] 4.4 Record fresh verification evidence and confirm no unrelated working-tree changes were overwritten
