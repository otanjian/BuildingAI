## Context

The Doris MCP server is `doris-mcp-server==1.0.0` connected to Doris 2.1.9 as `doris_ai_mcp`. The repository already contains SQL for `sap_meta` and a maintained SAP business dictionary, but the database objects are not published to the MCP principal and no Ossie model or binding assets are configured.

## Goals / Non-Goals

**Goals:**

- Publish and grant the existing SAP metadata layer.
- Generate a small, valid Ossie model for the currently available ERP datasets.
- Bind semantic datasets only to existing Doris tables/views and validate them before restart.
- Keep the MCP server read-only and observable.

**Non-Goals:**

- Enabling MetricFlow, ADBC, or write/administration tools.
- Upgrading Doris or changing source ERP data.
- Granting broad ADMIN/OPERATOR privileges to the business query account.

## Decisions

1. **Use the existing `sap_meta` SQL contract.** The metadata DDL, seed, and MCP views are already the project’s source of truth; reusing them avoids a second semantic registry.
2. **Use one bounded Ossie model first.** A single enterprise model with datasets for the currently materialized sales, procurement, finance, production, and planning tables is easier to validate and lets the agent discover semantics immediately. More domain-specific models can be split later without changing the binding contract.
3. **Bind to physical tables, not free-form queries.** Ossie bindings will use `kind=table` and exact `catalog/database/object` identities, so startup can validate object visibility and prevent ambiguous SQL sources.
4. **Keep privileges separate from operations.** The MCP account receives `SELECT` on `sap_meta` only; cluster probes that require ADMIN/OPERATOR remain a separate future observer-account change.

## Risks / Trade-offs

- [Risk] Some planned ERP tables may not exist in the current sample database → Mitigation: inspect actual tables first and bind only verified objects; omit absent domains with an explicit readiness report.
- [Risk] Metadata seeds are minimal → Mitigation: load the maintained business dictionary and report coverage; do not infer missing definitions.
- [Risk] Semantic model schema evolves with the installed package → Mitigation: validate against the pinned packaged schema before enabling the server.

## Migration Plan

1. Validate actual Doris databases and tables.
2. Apply metadata DDL/seed/views and grant read-only access.
3. Generate and validate the Ossie model and binding manifest.
4. Update Doris MCP `.env`, restart only the Doris MCP process, and run readiness plus semantic/query smoke tests.
5. Roll back by restoring the prior `.env`, stopping the semantic configuration, and revoking the added `sap_meta` grant if verification fails.

## Verification Record

The metadata views are readable by `doris_ai_mcp` (table context: 1 row; column context: 5 rows; code context: 5 rows; relation context: 2 rows; business search: 3 rows). The Ossie loader accepted one model with five datasets and ten metrics. The live MCP manifest now reports four callable semantic children: model listing, model summary, semantic context, and mapping status. `enterprise.operations.v1` resolves all five bound datasets. MetricFlow and ADBC remain disabled. A read-only query against `sap_meta.v_mcp_table_context` succeeds.
