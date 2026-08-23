## Context

See `proposal.md` for motivation. The main API already owns a stateless Bowi MCP endpoint, a provider registry, verified principals, managed OpenCode metadata, and Todo capability enforcement. SAP currently enters OpenCode through two direct integrations: an ADT stdio server wrapped by a single-transport SSE gateway on `:8100`, and a native FastMCP PyRFC server on `:8200/mcp` with a process-global connection registry.

ADT exposes about 128 mixed-risk tools under one environment credential. PyRFC exposes a smaller catalog but requires `sap_connect` and a bearer-like `connection_id`. The existing Bowi MCP client authentication identifies the trusted runtime; subject and call correlation come from an assertion or managed OpenCode `_meta`.

## Goals / Non-Goals

**Goals:**

- Present a small stable SAP domain catalog through Bowi.
- Keep identity, credentials, upstream tool names, transport sessions, and PyRFC handles internal.
- Preserve independent ADT and PyRFC runtimes and failure boundaries.
- Fail closed on missing capabilities, profiles, unknown RFCs, and upstream uncertainty.
- Make multi-client ADT transport correct before routing Bowi traffic to it.

**Non-Goals:**

- Generic arbitrary remote-MCP federation.
- Persisting SAP credentials in a new database table.
- Automatic translation of every upstream schema.
- Transparent retry of SAP writes.

## Decisions

### Add one SAP provider with two explicit adapters

`SapBowiProvider` owns stable Bowi schemas and delegates to `SapAdtMcpAdapter` or `SapPyrfcMcpAdapter`. The adapters use an internal JSON-RPC Streamable HTTP client with bounded timeouts and explicit lifecycle rather than exposing generic upstream tool discovery. Tool mappings are code-reviewed data, so upstream catalog drift cannot expand authority.

Alternative: register all upstream tools dynamically. Rejected because names, schemas, and risk classifications would become an untrusted authorization surface.

### Resolve profiles from verified subject plus server configuration

`SapConnectionProfileService` accepts only a principal with `subjectUserId`. It loads optional user-specific SAP fields from the existing `personalParams` dictionary when a compatible resolver is available, then fills non-secret endpoint defaults from environment configuration. For managed local deployments it can use an explicitly enabled service profile from server environment. Complete profiles are held only for the call and redacted from logs.

The accepted personal-parameter keys are narrowly normalized aliases for host/URL, client, language, username, password, system number, router, and backend. Bowi also supports the platform's existing composite `sap链接参数` / `sap_connection` value, parsing its `conn=/H/.../S/32xx`, query-string, or semicolon fields internally. Explicit structured personal parameters override composite fields. Model arguments never participate in profile selection.

Alternative: add a new encrypted SAP profile entity. Deferred because the platform already has personal secret settings and this change can keep persistence out of the SAP gateway. A dedicated credential vault remains the production evolution.

The current PyRFC runtime accepts dynamic credentials, so user-specific profiles are passed only to its internal `sap_connect` call. The current ADT vendor runtime reads one credential set at process start and cannot accept a per-call profile. Consequently the initial ADT adapter is enabled only when `BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED=true`; Bowi still authorizes and audits the invoking subject, but SAP records the configured technical identity. Per-user ADT identity requires a future credential-aware worker manager or upstream vendor change and MUST NOT be implied by this implementation.

### Capabilities are granular and profile-aware

Extend `BowiCapability` with `sap.read`, `sap.write`, `sap.transport`, `sap.debug`, `sap.rfc`, and `sap.rfc.admin`. Invocation assertions can carry these capabilities. Managed personal OpenCode sessions receive the comma-separated capabilities configured by `BOWI_MCP_OPENCODE_CAPABILITIES`; development defaults may include `sap.read` and `sap.rfc`, while production defaults to no SAP capability unless explicitly configured.

The RFC adapter also enforces `SAP_RFC_ALLOWLIST` for `sap.rfc`; `sap.rfc.admin` bypasses only that function-name allowlist, not principal/profile checks.

`tools/list` is deterministic for a given principal and filters out tools for which that principal lacks the configured capability. Because MCP discovery occurs before OpenCode has call-level BuildingAI session metadata, a trusted managed client may discover the deployment-approved SAP catalog. Execution repeats the capability check and additionally requires verified subject metadata for every Todo or SAP call, so a direct client cannot execute subject-scoped tools merely by knowing their names.

### Hide PyRFC connection IDs behind a subject-scoped lease registry

The PyRFC adapter maintains an in-memory lease keyed by a one-way subject/profile fingerprint. A per-key promise lock prevents duplicate connects. Each lease contains only the upstream handle, last-use timestamp, and fingerprint; it is never returned in Bowi output. Idle leases are swept by a timer and `sap_disconnect` is best-effort on eviction and shutdown.

Read-only PyRFC calls may reconnect once when the upstream reports an unknown/expired handle. RFC/BAPI calls are not automatically retried because their side effects are not generally knowable.

Alternative: require the model to call `sap_connect`. Rejected because it exposes credentials and connection capabilities to prompt/tool state.

### ADT uses one stateful HTTP session per Bowi adapter client

The ADT wrapper changes from legacy SSE to pinned `supergateway` stateful Streamable HTTP. Both the gateway package and the reviewed ADT vendor commit are pinned. Every initialized MCP session gets its own stdio child. The Bowi ADT adapter creates a short-lived client per call initially and always closes it, favoring isolation over connection reuse. Stateful multi-step debug workflows are classified but not enabled in the initial curated catalog.

Source mutation is a bounded exception to the one-upstream-call pattern: the adapter performs `lock` → `setObjectSource` → best-effort `unLock` inside one short-lived MCP session. The ADT lock handle never crosses the Bowi boundary. This makes the public write tool self-contained while preserving the vendor runtime's session-local state and cleanup semantics.

Alternative: direct stdio from the API. Rejected because it couples the API host to vendor files and cannot support separately deployed SAP integration workers.

### Initial catalog is deliberately small

Initial tools are:

- `sap_healthcheck` (both upstreams, `sap.read`)
- `sap_search_objects`, `sap_get_object_source`, `sap_read_table` (ADT or RFC read path, `sap.read`)
- `sap_get_rfc_function_description`, `sap_call_rfc` (PyRFC, `sap.rfc`; unrestricted names require admin)
- `sap_set_object_source`, `sap_activate_objects` (ADT, `sap.write`)
- `sap_get_transport`, `sap_create_transport` (ADT, `sap.transport`)

Schemas are copied and normalized at the Bowi boundary rather than inherited at runtime. Debug capability is reserved for a later catalog addition after conversation-scoped leases are designed.

### Audit at the provider boundary

An interceptor-like execution wrapper records adapter, Bowi tool, upstream tool, principal IDs, correlation IDs, duration, and normalized outcome using the application logger. It never records credentials, source, RFC parameters, table rows, or upstream raw errors. Upstream failures map to stable `SAP_PROFILE_REQUIRED`, `SAP_UPSTREAM_UNAVAILABLE`, `SAP_UPSTREAM_REJECTED`, and `SAP_RFC_NOT_ALLOWED` errors.

### OpenCode usage guidance mirrors the gateway boundary

A project-level OpenCode skill provides the model with stable routing rules: personal Todo and normal SAP work use server-prefixed Bowi tools, while direct `sap-abap` and `sap-pyrfc` catalogs are absent from ordinary configuration and may be added temporarily for opt-in administrator diagnostics. Detailed direct protocols are kept in conditional references so they do not distract ordinary business requests.

The managed BuildingAI session instruction no longer tells the model to call `sap_connect` for every SAP task. It explains that Bowi resolves profiles internally and reserves the credential bridge for an explicitly enabled direct PyRFC diagnostic. Direct ADT mutations keep `lockHandle` within one MCP session; direct PyRFC diagnostics create one `connection_id`, reuse it for the diagnostic, and disconnect in cleanup. Neither handle is valid input to Bowi.

Because OpenCode performs MCP discovery before call-level session metadata exists, the trusted key-only discovery principal includes `todo.personal` together with deployment-configured SAP capabilities. This reveals schemas only. Execution still resolves a unique login-bound chat record and denies every Todo or SAP call without a verified subject, so discovery does not expand data access.

## Risks / Trade-offs

- [Server environment service credentials act as a shared SAP identity] → Disable service-profile fallback by default in production and prefer user-specific personal parameters.
- [API restart loses PyRFC leases] → Reconnect lazily; handles are an optimization, not durable state.
- [Upstream schemas drift] → Contract tests compare every mapped upstream name to `tools/list` in deployment verification.
- [Short-lived ADT children add latency] → Measure first; add a bounded subject-scoped pool only if necessary.
- [A generic RFC may mutate SAP despite its name] → Default-deny allowlist and never retry RFC calls automatically.
- [OpenCode users may still have global direct SAP entries] → Remove them from ordinary configuration after Bowi is verified; retain endpoint details only in administrator diagnostic documentation.

## Migration Plan

1. Deploy profile resolution, capability parsing, adapters, curated provider, and tests with direct SAP OpenCode entries still available.
2. Start ADT on a pinned stateful Streamable HTTP endpoint and run concurrent-session verification on a non-default port.
3. Point Bowi adapters at ADT `/mcp` and PyRFC `/mcp`; verify health, catalog, one ADT read, and one PyRFC read/RFC metadata call.
4. Enable SAP capabilities for a pilot managed user and verify subject isolation and audit output.
5. Remove direct SAP entries from ordinary managed OpenCode configuration and retain their endpoint details only in documented administrator diagnostics.
6. Roll back by disabling the SAP provider via configuration and re-enabling direct diagnostic MCP entries; Todo and EHCS providers remain unchanged.
