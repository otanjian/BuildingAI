# SAP ABAP ADT MCP (BuildingAI)

Connect BuildingAI chat to SAP via [yan252/mcp-abap-abap-adt-api](https://github.com/yan252/mcp-abap-abap-adt-api) (ABAP Development Tools REST API over HTTPS). No NW RFC SDK or Docker required.

```
BuildingAI Chat → streamable-http → supergateway :8100 → stdio → mcp-abap-abap-adt-api → SAP ADT (HTTPS)
```

## Prerequisites

- Node.js 18+
- SAP user with ADT access (typically developer role; `S_DEVELOP`, etc.)
- HTTPS URL to the SAP application server with ADT enabled (confirm port with basis)

## Quick start

**Recommended (from repo root):**

```bash
cp integrations/sap-abap-adt-mcp/.env.example integrations/sap-abap-adt-mcp/.env
# Edit SAP_URL, SAP_USER, SAP_PASSWORD, SAP_CLIENT, SAP_LANGUAGE
./start.sh restart    # starts dev stack + SAP MCP
./start.sh status
```

**SAP MCP only:**

```bash
cd integrations/sap-abap-adt-mcp
cp .env.example .env
chmod +x start.sh
./start.sh
```

On first run, `start.sh` clones the upstream repo into `vendor/mcp-abap-abap-adt-api`, installs dependencies, and builds.

## BuildingAI registration

1. Start `./start.sh` (listens on `http://127.0.0.1:8100/mcp` by default).
2. Console → **AI → MCP Services** → add server:
   - **Name:** `SAP-ABAP-ADT`
   - **Type:** Streamable HTTP
   - **URL:** `http://127.0.0.1:8100/mcp`
3. Enable the MCP server in chat and call tools such as `healthcheck`, `searchObject`, `tableContents`, `runQuery`.

Root `mcp.json` includes the same URL for local Cursor use.

## Environment variables

| Variable | Description |
|----------|-------------|
| `SAP_URL` | ADT base URL, e.g. `https://host:44300` |
| `SAP_USER` / `SAP_PASSWORD` | SAP credentials |
| `SAP_CLIENT` | Client number (e.g. `200`) |
| `SAP_LANGUAGE` | Logon language (e.g. `ZH`) |
| `SAP_SESSION_TYPE` | `stateless` (default) or `stateful` |
| `MCP_PORT` / `MCP_PATH` | HTTP gateway (default `8100`, `/mcp`) |

## Differences from RFC-based access

This integration uses **ADT**, not PyRFC:

- Strong for ABAP objects, source, syntax check, transports, DDIC, `tableContents` / `runQuery`.
- Not a drop-in replacement for arbitrary RFC function modules (e.g. custom `Z*` BAPIs) unless exposed via ADT.
- `SAP_URL` is the **HTTPS ADT endpoint**, not the SAProuter string (`/H/.../S/...`). Ask basis for the correct host and ICM HTTPS port.

## Troubleshooting

- **401 / login failed:** Check user, password, client, and that ADT is allowed for the user.
- **Certificate errors:** `NODE_TLS_REJECT_UNAUTHORIZED=0` is set for lab systems with self-signed certs.
- **Connection refused on :8100:** Ensure `start.sh` is running and nothing else uses the port.
- **Update upstream:** `MCP_ABAP_ADT_PULL=1 ./start.sh`

## Upstream

- Repository: https://github.com/yan252/mcp-abap-abap-adt-api
- Fork of mario-andreschak/mcp-abap-abap-adt-api with JSON-RPC fixes for IDE agents
