# HTML / ECharts verification notes

## Streamdown HTML (tasks 3.1 / 3.2)

Verified against Streamdown 2.3.0 pipeline used by `MessageResponse` / `ReasoningContent`:

- Markdown HTML passes through `remark-rehype` with `allowDangerousHtml: true`, then `rehype-raw`, then security plugins (`rehype-harden` / `rehype-sanitize`).
- Safe structural markup (e.g. `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `<span>`, `<p>`, `<strong>`, `<em>`) is expected to render as rich content via GFM + sanitized HTML.
- `<script>` tags and inline event handlers are stripped / not executed by the sanitize layer. No allowlist expansion was required for this change.

No code change for HTML beyond confirming both message and reasoning paths share the same Streamdown stack (and now the same custom `code` components for ECharts fences).

## ECharts path coverage (tasks 4.1 / 4.2)

Covered by unit tests + code branches in `CollapsibleMarkdownCode`:

| Case | Behavior |
|------|----------|
| Incomplete fence (`useIsCodeFenceIncomplete`) | Renders `BlockCodePanel` only — no `EchartsBlock` init |
| Invalid JSON / rejected option | Error hint + code fallback |
| Valid option | `EchartsBlock` with lazy `import('echarts')`, resize, dispose on unmount |
| Safe HTML samples | Unchanged Streamdown sanitize (above) |
| Script / onclick HTML | Not executed (sanitize) |

Browser smoke (optional after deploy): paste a complete ` ```echarts ` option in chat and confirm interactive chart; paste `<script>alert(1)</script>` and confirm no alert.
