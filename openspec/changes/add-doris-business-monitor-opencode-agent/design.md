## Context

The repository already contains a working OpenCode agent path, a connectable Doris MCP server, SAP business-semantic metadata, and Doris layers `sap_ods`, `sap_dwd`, `sap_dws`, `sap_ai`, and `sap_meta`. The user explicitly requested configuration only, so no source or schema changes are in scope.

## Goals / Non-Goals

**Goals:** configure one reusable OpenCode agent for read-only enterprise monitoring; make the Doris workspace and artifact boundary explicit; encode semantic and evidence-first analysis behavior.

**Non-Goals:** adding tools or MCP endpoints; changing Doris SQL/DDL; modifying OpenCode or BuildingAI code; enabling SAP writes, todo mutations, or automatic business transactions; creating dashboards or scheduled alerts.

## Decisions

- **Reuse the existing Doris MCP server** rather than create another connector: it is already registered, connectable, and exposes the Doris inspection domains needed by the agent.
- **Bind only Doris MCP for this agent** rather than the broader Bowi gateway: this keeps the configuration read-only and prevents accidental SAP, todo, or business mutations.
- **Use the agent role prompt for policy and workflow**: this is the supported configuration field and is injected into OpenCode sessions without code changes.
- **Keep session artifacts isolated by conversation**: retain the existing `artifacts/{conversationId}` template for traceability and concurrent use.

## Risks / Trade-offs

- [Doris MCP connectivity can degrade] → Verify the registered server is connectable before enabling the agent and surface freshness/availability caveats in responses.
- [A role prompt cannot enforce database permissions by itself] → Keep the MCP binding read-only and rely on server-side tool authorization as the enforcement boundary.
- [Existing agent name may already be present] → Update the existing Doris workspace agent when an exact match exists; otherwise create one with a unique name.

## Migration Plan

1. Locate the existing Doris OpenCode agent and the registered Doris MCP server.
2. Apply the agent fields and replace its MCP binding with the Doris server only.
3. Verify the persisted configuration and run a read-only health/query smoke check.
4. Roll back by restoring the prior agent JSON and MCP server ID list if verification fails.
