# Bowi SAP Gateway

Bowi MCP is the normal SAP entry point for Bowi AI agents and managed OpenCode sessions. SAP ADT and
PyRFC remain private upstream services:

```text
OpenCode / Agent → Bowi MCP :4090
                       ├─ curated ADT adapter → :8100/mcp → SAP ADT
                       └─ curated RFC adapter → :8200/mcp → SAP NW RFC SDK
```

## Security model

- Bowi resolves the verified Bowi AI subject; models cannot supply user IDs, passwords, MCP session
  IDs, or PyRFC `connection_id` values.
- ADT source updates acquire and release their lock inside one isolated upstream session; lock
  handles are never model-visible.
- PyRFC credentials come from that user's `personalParams`, using structured `sap_ashost`,
  `sap_sysnr`, `sap_client`, `sap_user`, `sap_password`, and optional fields, or the existing
  composite `sap链接参数` / `sap_connection` format. Structured values take precedence.
- Environment SAP credentials are used by Bowi PyRFC only when
  `BOWI_SAP_SERVICE_PROFILE_ENABLED=true`.
- The current ADT vendor is a process-level technical identity. Enable it explicitly with
  `BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED=true`; Bowi still authorizes and audits the verified caller.
- `sap.rfc` is restricted by `SAP_RFC_ALLOWLIST`. Only `sap.rfc.admin` bypasses the name allowlist.

## Configuration

```dotenv
BOWI_SAP_ADT_MCP_URL=http://127.0.0.1:8100/mcp
BOWI_SAP_PYRFC_MCP_URL=http://127.0.0.1:8200/mcp
BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED=true
BOWI_SAP_SERVICE_PROFILE_ENABLED=false
BOWI_MCP_OPENCODE_CAPABILITIES=sap.read,sap.rfc
SAP_RFC_ALLOWLIST=RFC_PING,RFC_READ_TABLE,BAPI_COMPANYCODE_GETLIST
BOWI_SAP_MCP_TIMEOUT_MS=15000
BOWI_SAP_CONNECTION_IDLE_TTL_MS=1800000
```

Production has no default SAP capabilities. Grant only the minimum required set from `sap.read`,
`sap.write`, `sap.transport`, `sap.debug`, `sap.rfc`, and `sap.rfc.admin`.

## Verification

```bash
curl --noproxy '*' http://127.0.0.1:8100/healthz
node integrations/sap-abap-adt-mcp/smoke-two-sessions.mjs
./start.sh status
```

The smoke test opens two simultaneous MCP sessions, lists tools, calls `healthcheck` in both,
verifies distinct session IDs, and closes both sessions.

An authorized Bowi health check may report an adapter as `unavailable` while its process is online
when the caller has no complete PyRFC profile or the ADT service-profile switch is disabled. This is
a fail-closed profile result, not a transport health result.

## OpenCode migration

Register only `bowi` for normal managed sessions. Do not keep direct `sap-abap` or `sap-pyrfc`
entries in ordinary OpenCode configuration. An administrator may add one direct entry temporarily
for diagnosis and must remove it afterward; the private upstream processes continue running for
Bowi. Direct OpenCode CLI sessions without Bowi AI invocation metadata can discover Bowi tools but
cannot execute subject-scoped SAP operations.
