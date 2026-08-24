# SAP PyRFC MCP (BuildingAI)

Connect BuildingAI chat to SAP via **PyRFC** and **SAP NW RFC SDK** (`libsapnwrfc`). Complements the ADT-based `sap-abap` integration for arbitrary RFC/BAPI calls.

For normal agent use, register only Bowi MCP and follow [`BOWI_SAP.md`](../../BOWI_SAP.md). Direct registration below is retained for administrator diagnostics.

Supports **dynamic multi-user connections** (same chat UX as sap-abap):

```
BuildingAI Chat → streamable-http → sap-pyrfc-mcp :8200/mcp (single Python process)
                                      ├─ sap_connect → connection_id
                                      └─ call_rfc / read_table / … (require connection_id)
```

Design: [`docs/design-dynamic-connections.md`](docs/design-dynamic-connections.md)

## Adaptability (PyRFC + ADT fallback)

| Layer | Behavior |
|-------|----------|
| **SDK probe** | Detects macOS `.dylib` / Linux `.so`, tier, and native architecture |
| **Installer** | macOS architecture-specific wheel + private rpath repair; Linux source/legacy build |
| **Runtime selection** | macOS ARM64 uses native `.venv`; Intel macOS SDK on Apple Silicon uses Rosetta `.venv-x86_64`; Linux keeps native `.venv` |
| **ADT fallback** | When PyRFC unavailable or `SAP_ASHOST` unset, uses ADT HTTPS (`read_table`, `run_query`) |
| **Auto env** | Loads credentials from `../sap-abap-adt-mcp/.env` when local `.env` is empty |
| **Backend** | `SAP_BACKEND=auto\|pyrfc\|adt` (default `auto`) |

```bash
./install-nwrfcsdk.sh /path/to/official-sdk-archive
./install-pyrfc.sh
./verify.sh                            # local SDK/import check
./verify.sh --live                     # optional RFC_PING
./start.sh
```

**Tool availability by backend:**

| Tool | PyRFC | ADT fallback | Needs `connection_id` |
|------|-------|--------------|------------------------|
| `sap_connect` / `sap_disconnect` / `sap_whoami` | — | — | connect returns id |
| `healthcheck` | yes | yes | optional |
| `read_table` | yes | yes | **required** |
| `run_query` | no | yes | **required** |
| `call_rfc` | yes | no | **required** |
| `get_rfc_function_description` | yes | no | **required** |

## When to use PyRFC vs ADT

| Capability | PyRFC (this) | ADT (`sap-abap-adt-mcp`) |
|------------|--------------|---------------------------|
| Custom RFC / BAPI / Z* FM | Yes | Limited |
| RFC_READ_TABLE | Yes | Via ADT `tableContents` |
| ABAP source, transports, syntax check | No | Yes |
| Requires NW RFC SDK | Yes | No |

## Direct diagnostic usage (multi-user)

Normal OpenCode/agent calls use Bowi's `sap_*` tools and never see credentials or `connection_id`. The sequence below is only for administrators diagnosing this private upstream directly.

```text
1) sap_connect(ashost, sysnr, user, password, client[, saprouter][, url])
   → { connection_id, … }   # password never echoed

2) read_table({ connection_id, table_name: "T001", … })
   call_rfc({ connection_id, function_name: "BAPI_…", … })

3) sap_disconnect({ connection_id })
```

Reuse `connection_id` across turns in the same conversation. Concurrent users each call `sap_connect` and keep their own id.

## Prerequisites

- Python 3.10–3.12 matching the SDK architecture (`python3-venv` on Debian/Ubuntu)
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

### macOS (Apple Silicon)

The installer selects one of two macOS profiles from the supplied `.dylib`
architecture. Neither wheel contains SAP's licensed runtime:

| SDK libraries | Execution | Python | PyRFC | Managed environment |
|---------------|-----------|--------|-------|---------------------|
| macOS ARM64 | native | 3.10–3.12 ARM64 | 3.3.1 | `.venv` |
| macOS x86_64 | Rosetta 2 | 3.10 x86_64 | 3.3 | `.venv-x86_64` |

The environments can coexist. Installing an Intel profile does not remove the
native environment. A Linux x86_64 `.so` package is still rejected on macOS
because Rosetta translates macOS Mach-O binaries, not Linux ELF binaries.

```bash
cd integrations/sap-pyrfc-mcp
./install-nwrfcsdk.sh ~/Downloads/<macos-sdk-archive-or-directory>
./install-pyrfc.sh
./verify.sh
./verify.sh --live
```

The installer keeps the SDK inside this integration, records the selected
profile in `.env.local-sdk`, and repairs the wheel's
`/usr/local/sap/nwrfcsdk/lib` rpath with `install_name_tool`; it does not need
`sudo` or a global `/usr/local/sap` installation. Installation, verification,
and service startup apply the required Rosetta prefix automatically.

PyRFC 3.3.1 is pinned for ARM64. PyRFC 3.3 is pinned for x86_64 because 3.3.1
does not publish an Intel macOS wheel. These releases are yanked/unmaintained, so
keep this upstream private and isolated behind Bowi MCP.

### Linux

Download the official SDK matching the Linux host architecture, then run:

```bash
./install-nwrfcsdk.sh /path/to/nwrfcsdk-*.zip
./install-pyrfc.sh
./verify.sh
```

Linux behavior is retained: it selects native `.venv` and builds PyRFC from
SDK-backed source, including the existing legacy compatibility patch when
required. The macOS Rosetta path is never selected on Linux.

`./install-nwrfcsdk.sh --from-github` remains available only for Linux local
development. The community mirror contains old Linux `.so` files and is not a
macOS installation source. Production must use an official SAP download.

Edit `.env` with connection details:

| Variable | Description |
|----------|-------------|
| `SAP_ASHOST` | Application server hostname |
| `SAP_SYSNR` | Instance number (e.g. `00`) |
| `SAP_CLIENT` | Client (e.g. `100`) |
| `SAP_USER` / `SAP_PASSWORD` | RFC user |
| `SAP_LANGUAGE` | Logon language |
| `SAP_SAPROUTER` | Optional router string |
| `SAP_MSHOST` / `SAP_MSSERV` / `SAP_GROUP` / `SAP_R3NAME` | Message server logon (alternative) |

Start:

```bash
./start.sh
# Or from repo root:
./start.sh restart sap-pyrfc
```

## Direct BuildingAI registration (administrator diagnostics only)

1. Start the server (listens on `http://127.0.0.1:8200/mcp` by default).
2. Console → **AI → MCP Services** → add server:
   - **Name:** `SAP-PyRFC`
   - **Type:** Streamable HTTP
   - **URL:** `http://127.0.0.1:8200/mcp`
3. Diagnose with `sap_connect`, then `read_table` / `call_rfc`, remove the temporary direct entry afterward, and restart OpenCode.

Root `mcp.json` intentionally points normal clients at Bowi instead of this upstream.

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

- **`platform_mismatch`**: the SDK is for another OS (commonly Linux `.so` on macOS); download the official package for this host.
- **Architecture mismatch**: Python and both SAP libraries must share `arm64` or `x86_64`; `./verify.sh` prints all detected values.
- **Rosetta required**: an Intel macOS SDK on Apple Silicon requires Rosetta 2 and an x86_64-capable Python 3.10; provisioning checks both before changing the active SDK.
- **`PyRFC is not available`**: run `./install-nwrfcsdk.sh <official-sdk>` and `./install-pyrfc.sh`, then inspect `./verify.sh`.
- **`Library not loaded: @rpath/...` on macOS**: rerun `./install-pyrfc.sh` to repair the wheel and SDK rpaths.
- **`connection_failed`**: Check firewall, SAProuter, user RFC authorizations, client number.
- **Port conflict with ADT MCP**: ADT uses `8100`; PyRFC defaults to `8200`.
