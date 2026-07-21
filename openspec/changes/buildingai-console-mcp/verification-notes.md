# Verification notes — buildingai-console-mcp

## Operator setup (Cursor)

1. Open console → `/console-mcp-keys` (or navigate to Console MCP API Keys).
2. Create a key with a label (e.g. `Cursor`). **Copy the secret once** — it is not shown again.
3. Add an MCP server in Cursor:

```json
{
  "mcpServers": {
    "buildingai-console-mcp": {
      "url": "http://127.0.0.1:4090/mcp/buildingai-console-mcp",
      "headers": {
        "Authorization": "Bearer bcmk_YOUR_SECRET_HERE"
      }
    }
  }
}
```

Replace the origin with your API base (`APP_DOMAIN` / production host). Accept headers must include both `application/json` and `text/event-stream` (Cursor MCP clients typically do).

4. After connect, `initialize` should report `serverInfo.name: "buildingai-console-mcp"`.
5. `tools/list` only returns tools your user can call (`agents:list`, `ai-mcp-servers:list`, plus always `create_agent` for authenticated users).
6. Revoke the key in the console UI → subsequent MCP requests return unauthorized.

## Manual checks (tasks 5.1 / 5.2)

- [ ] Create key → `initialize` / `tools/list` / `tools/call` succeed with Bearer key
- [ ] Revoke key → requests fail with unauthorized
- [ ] Non-privileged role: `console_list_agents` absent from list; call returns `permission_denied`
- [ ] Privileged role / root: list tools include `console_list_agents`

## Automated

```bash
cd packages/api && pnpm exec jest src/modules/console-mcp --no-coverage
cd packages/api && pnpm check-types
openspec validate buildingai-console-mcp
```
