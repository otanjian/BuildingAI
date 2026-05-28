# SAP PyRFC MCP (BuildingAI)

Connect BuildingAI chat to SAP via **PyRFC** and **SAP NW RFC SDK** (`libsapnwrfc`). Complements the ADT-based integration for arbitrary RFC/BAPI calls.

```
BuildingAI Chat → streamable-http → supergateway :8200 → stdio → sap-pyrfc-mcp (Python) → SAP RFC
```

## Adaptability (PyRFC + ADT fallback)

| Layer | Behavior |
|-------|----------|
| **SDK probe** | Detects `legacy` vs `modern` NW RFC SDK |
| **Legacy patch** | `./install-pyrfc.sh` auto-patches PyRFC when SDK lacks `libsapcrypto` |
| **ADT fallback** | When PyRFC unavailable or `SAP_ASHOST` unset, uses ADT HTTPS (`read_table`, `run_query`) |
| **Auto env** | Loads credentials from `../sap-abap-adt-mcp/.env` when local `.env` is empty |
| **Backend** | `SAP_BACKEND=auto\|pyrfc\|adt` (default `auto`) |

```bash
./install-nwrfcsdk.sh --from-github   # DevSidecar proxy supported
./install-pyrfc.sh                    # legacy SDK patch + build
./start.sh
# healthcheck → shows active_backend: pyrfc | adt
```

**Tool availability by backend:**

| Tool | PyRFC | ADT fallback |
|------|-------|--------------|
| `healthcheck` | yes | yes |
| `read_table` | yes | yes |
| `run_query` | no | yes |
| `call_rfc` | yes | no |
| `get_rfc_function_description` | yes | no |

## When to use PyRFC vs ADT

| Capability | PyRFC (this) | ADT (`sap-abap-adt-mcp`) |
|------------|--------------|---------------------------|
| Custom RFC / BAPI / Z* FM | Yes | Limited |
| RFC_READ_TABLE | Yes | Via ADT `tableContents` |
| ABAP source, transports, syntax check | No | Yes |
| Requires NW RFC SDK | Yes | No |

## Prerequisites

- Python 3.10+ and `python3-venv` (Debian/Ubuntu: `sudo apt install python3-venv`)
- Node.js 18+ (for supergateway HTTP bridge)
- **SAP NW RFC SDK** from [SAP Support Portal](https://support.sap.com/en/product/connectors/nwrfcsdk.html) (S-user required to download)
- SAP application user with RFC authorization (when connecting to a real system)

## Quick start (no SAP account yet)

The server can start **without credentials** so you can register MCP and run `healthcheck`:

```bash
cd integrations/sap-pyrfc-mcp
cp .env.example .env
chmod +x start.sh install-nwrfcsdk.sh
./start.sh
```

`healthcheck` returns setup steps until SDK and credentials are configured.

## Full setup (with SAP system)

### Option A — GitHub mirror via DevSidecar (no S-user, dev only)

If [DevSidecar](https://github.com/docmirror/dev-sidecar) is running locally (default proxy `127.0.0.1:31181`), clone the community SDK mirror:

```bash
./install-nwrfcsdk.sh --from-github
cat .env.local-sdk >> .env
source .venv/bin/activate
export SAPNWRFC_HOME="$(grep SAPNWRFC_HOME .env.local-sdk | cut -d= -f2)"
export LD_LIBRARY_PATH="${SAPNWRFC_HOME}/lib:${LD_LIBRARY_PATH:-}"
pip install pyrfc
```

Source: [juanmoura/nwrfcsdk](https://github.com/juanmoura/nwrfcsdk) — use only for local development; production should use the official SAP download.

> **Version note:** The GitHub mirror is often an **older SDK** (no `libsapcrypto`). Current [PyRFC](https://github.com/SAP/PyRFC) requires NW RFC SDK **7.50+** from SAP. If `pip install pyrfc` fails with `RfcLoadCryptoLibrary`, download the official SDK instead.

```bash
./install-pyrfc.sh   # after SDK is installed; uses DevSidecar proxy for git
```

### Option B — Official SAP Software Center

1. Download NW RFC SDK for Linux x86_64 from SAP Software Center.
2. Install SDK and PyRFC:

```bash
./install-nwrfcsdk.sh /path/to/nwrfcsdk-*.zip
cat .env.local-sdk >> .env
source .venv/bin/activate
export SAPNWRFC_HOME="$(grep SAPNWRFC_HOME .env.local-sdk | cut -d= -f2)"
export LD_LIBRARY_PATH="${SAPNWRFC_HOME}/lib:${LD_LIBRARY_PATH:-}"
pip install pyrfc
```

3. Edit `.env` with connection details:

| Variable | Description |
|----------|-------------|
| `SAP_ASHOST` | Application server hostname |
| `SAP_SYSNR` | Instance number (e.g. `00`) |
| `SAP_CLIENT` | Client (e.g. `100`) |
| `SAP_USER` / `SAP_PASSWORD` | RFC user |
| `SAP_LANGUAGE` | Logon language |
| `SAP_SAPROUTER` | Optional router string |
| `SAP_MSHOST` / `SAP_MSSERV` / `SAP_GROUP` / `SAP_R3NAME` | Message server logon (alternative) |

4. Start:

```bash
./start.sh
# Or from repo root:
./start.sh restart sap-pyrfc
```

## BuildingAI registration

1. Start the server (listens on `http://127.0.0.1:8200/mcp` by default).
2. Console → **AI → MCP Services** → add server:
   - **Name:** `SAP-PyRFC`
   - **Type:** Streamable HTTP
   - **URL:** `http://127.0.0.1:8200/mcp`
3. Enable in chat and call `healthcheck`, `read_table`, `call_rfc`, `get_rfc_function_description`.

Root `mcp.json` includes the same URL for local Cursor use.

## MCP tools

| Tool | Description |
|------|-------------|
| `healthcheck` | SDK install status, env config, optional RFC_PING |
| `call_rfc` | Call any RFC/BAPI with JSON parameters |
| `get_rfc_function_description` | Function module metadata |
| `read_table` | Wrapper for `RFC_READ_TABLE` |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PORT` | `8200` | HTTP gateway port |
| `MCP_PATH` | `/mcp` | Streamable HTTP path |
| `SAPNWRFC_HOME` | — | Extracted NW RFC SDK root |
| `SAP_PYRFC_SKIP_INSTALL` | `0` | Skip pip install on start |

## Troubleshooting

- **`PyRFC is not available`**: Run `install-nwrfcsdk.sh`, set `SAPNWRFC_HOME`, `pip install pyrfc`.
- **`connection_failed`**: Check firewall, SAProuter, user RFC authorizations, client number.
- **Port conflict with ADT MCP**: ADT uses `8100`; PyRFC defaults to `8200`.
