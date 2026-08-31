## Context

See `proposal.md` for motivation and `specs/opencode-html-artifact-preview/spec.md` for observable behavior. BuildingAI embeds the OpenCode Web application on the OpenCode origin with `buildingaiEmbed=1`. That iframe deliberately receives no BuildingAI bearer token. OpenCode's directory-scoped SDK already reads files through a server route that resolves the requested path against the active workspace and rejects escapes.

The OpenCode markdown renderer already identifies inline code that looks like a path, and the session timeline separately renders a changed-file summary. Generated report HTML is active, untrusted content, so a normal top-level Blob URL would be an unsafe execution boundary because Blob URLs inherit their creator's origin.

## Goals / Non-Goals

**Goals:**

- Give reply paths and changed-file rows one shared preview action.
- Preserve the click's browser activation while the file read completes asynchronously.
- Keep report code outside the OpenCode origin and restrict data egress.
- Keep the implementation embed-only and avoid a new cross-frame authentication protocol.

**Non-Goals:**

- Serving complete artifact directories or rewriting relative resource graphs.
- Sanitizing reports into inert HTML; report JavaScript remains supported inside isolation.
- Changing OpenCode's direct-route path behavior or BuildingAI's existing artifact card preview.

## Decisions

### 1. Preview through the OpenCode directory SDK

The session timeline owns the action and calls its existing directory-scoped `file.read({ path })`. This reuses the same runtime connection, authentication, directory header, and containment validation as the OpenCode file UI.

Using BuildingAI's conversation-artifact endpoint was rejected because the iframe does not possess the BuildingAI bearer token. Navigating to `file://` was rejected because browsers restrict it, it exposes host paths, and it bypasses workspace authorization.

### 2. Reserve a blank tab before reading

The click handler synchronously calls `window.open("", "_blank")`, removes opener access, writes a trusted loading state, and then awaits the file request. On success it navigates that reserved tab to a trusted preview-shell Blob URL; on failure it replaces the loading state with an escaped error. Blob URLs are revoked after the tab has loaded or after a bounded fallback delay.

Opening only after the asynchronous request was rejected because browsers commonly treat the later call as lacking transient user activation.

### 3. Use a trusted shell with a sandboxed `srcdoc` report

The top-level Blob contains only application-authored shell markup. It embeds the report in an iframe with `sandbox="allow-scripts"`, deliberately omitting `allow-same-origin`, forms, popups, downloads, and top-navigation permissions. The report receives an injected CSP that defaults to no resources, permits inline code and a small approved HTTPS CDN allowlist, permits inline/data/blob presentation assets, and denies connections, frames, objects, forms, and base-URL changes.

Opening the report itself as a Blob was rejected because it would inherit the OpenCode origin and could read same-origin browser state. Removing scripts was rejected because generated dashboards commonly need chart initialization.

### 4. Keep path discovery generic but activation embed-scoped

The reusable markdown component receives optional path-action predicates and handlers. Only the embedded session timeline supplies them, and only for case-insensitive `.html`/`.htm` paths after removing query/hash suffixes. It decorates eligible inline code with button semantics and handles click plus Enter/Space. The changed-file summary receives the same action as a separate icon button, leaving its accordion trigger intact.

### 5. First version supports single-file reports

The preview does not proxy neighboring files. A small shell notice states that local relative assets are unsupported. The current target report is self-contained except for ECharts from jsDelivr, which is included in the initial approved CDN policy.

## Risks / Trade-offs

- **[Risk] A required CDN is absent from the allowlist** → Keep the initial allowlist narrow and add domains only through reviewed changes.
- **[Risk] Large HTML increases memory while encoded into the shell** → Use one Blob per explicit click, revoke it after navigation, and rely on the existing file API limits/runtime behavior.
- **[Risk] The report attempts unsupported relative asset loads** → Show the single-file limitation in the shell and keep source/diff access available.
- **[Risk] Existing uncommitted OpenCode changes overlap timeline code** → Apply only narrow hunks after reviewing the live diff; never reset the adjacent repository.
- **[Trade-off] The preview shell is intentionally not a faithful local web server** → Isolation and minimal credential surface take priority over multi-file compatibility.

## Migration Plan

1. Add focused domain and integration tests in the OpenCode app/session UI.
2. Build the workspace OpenCode single binary so the embedded web bundle contains the feature.
3. Restart only the OpenCode runtime and verify reply-path plus changed-file entry points against a generated report.
4. Roll back by removing the embed-only action wiring and rebuilding the prior OpenCode runtime; no data or API migration is required.
