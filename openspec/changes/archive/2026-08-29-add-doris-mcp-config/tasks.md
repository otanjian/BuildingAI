## 1. Configuration

- [x] 1.1 Add the requested `doris` HTTP server entry to `mcp.json` without changing existing entries.
- [x] 1.2 Document the Doris endpoint and startup command in `使用说明.md`.

## 2. Verification

- [x] 2.1 Parse `mcp.json` and assert the Doris URL and transport values.
- [x] 2.2 Run `openspec validate add-doris-mcp-config` and inspect the final diff.
