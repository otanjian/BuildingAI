# Direct SAP MCP Diagnostics

Use this reference only for an explicitly requested administrator diagnosis. Normal Todo and SAP work uses Bowi.

Both direct servers use Streamable HTTP at `/mcp`, not legacy SSE. OpenCode prefixes the direct tool names with the configured server name. Do not add a direct configuration entry without authorization; remove the temporary entry and restart OpenCode after diagnosis.

## `sap-abap`: ADT upstream

Endpoint: `http://127.0.0.1:8100/mcp`.

This server uses the technical SAP profile configured in its process environment. It does not use `sap_connect` or a PyRFC `connection_id`. Use it for ABAP repository, source, activation, DDIC, and transport diagnosis.

Typical reads:

1. `sap-abap_healthcheck`
2. `sap-abap_searchObject` with `query`, optional `objType`, and optional `max`
3. `sap-abap_getObjectSource` with the returned `objectSourceUrl`

A direct source mutation is stateful and must remain on the same initialized MCP client session:

```text
sap-abap_lock({ objectUrl, accessMode: "MODIFY" })
  -> lockHandle
sap-abap_setObjectSource({ objectSourceUrl: objectUrl, source, lockHandle, transport? })
finally:
sap-abap_unLock({ objectUrl, lockHandle })
```

Do not start the write if the client cannot guarantee cleanup. Always attempt `unLock`, including after a failed write. Never reuse the handle after unlock, across MCP sessions, or in a Bowi call. Do not retry an uncertain write automatically.

For direct activation, `sap-abap_activateObjects` expects `objects` as a JSON-encoded array string whose objects contain the ADT fields required by the current tool schema. Follow the exposed schema rather than passing the Bowi array shape directly.

## `sap-pyrfc`: PyRFC/ADT upstream

Endpoint: `http://127.0.0.1:8200/mcp`.

This server owns a process-wide, multi-user connection registry. Establish one diagnostic connection, reuse it, then disconnect:

```text
sap-pyrfc_sap_connect({ user, password?, client, ashost?, sysnr?, ... })
  -> connection_id
sap-pyrfc_sap_whoami({ connection_id })
sap-pyrfc_healthcheck({ connection_id })
sap-pyrfc_read_table({ connection_id, table_name, fields, where, row_count, row_skip })
sap-pyrfc_get_rfc_function_description({ connection_id, function_name })
sap-pyrfc_call_rfc({ connection_id, function_name, parameters_json })
finally:
sap-pyrfc_sap_disconnect({ connection_id })
```

- Call `sap-pyrfc_healthcheck` without a connection ID only to inspect SDK/backend readiness.
- In a Bowi AI-managed session, omit `password` or pass `[masked]` so the credential bridge can inject it. Never ask the user to paste a password into chat.
- Inspect `connected`, `ping_error`, and error fields returned by `sap_connect`; a returned `connection_id` does not by itself prove that the live ping succeeded.
- Reuse one `connection_id` for the diagnostic conversation. Do not reconnect for every operation, share it between users, print it, persist it, or pass it to Bowi.
- Direct schemas differ from Bowi: `parameters_json` is a JSON string, `fields` is a comma-separated string, and names such as `table_name` and `function_name` use upstream snake_case.
- `call_rfc` requires the PyRFC backend. `run_query` is an ADT-fallback operation.
- If a handle expires during a read-only diagnostic, reconnect at most once. Never automatically retry `call_rfc` or another operation with uncertain side effects.
- Always call `sap-pyrfc_sap_disconnect` when the diagnostic finishes.
