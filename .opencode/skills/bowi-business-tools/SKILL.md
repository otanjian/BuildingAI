---
name: bowi-business-tools
description: Use BuildingAI personal Todo and SAP business tools through Bowi MCP. Also use for explicitly requested administrator diagnostics of the direct sap-abap or sap-pyrfc MCP servers.
---

# Bowi Business Tools

Treat Bowi as the normal business-tool boundary. OpenCode prefixes every MCP tool with its server name, so a Bowi tool such as `todo_search` appears as `bowi_todo_search`.

## Route the request

| Request | OpenCode tools |
| --- | --- |
| Personal Todo | `bowi_todo_*` |
| ABAP repository search, source, activation, or transport | `bowi_sap_*` backed by ADT |
| SAP table reads, RFC metadata, or allowlisted RFC/BAPI calls | `bowi_sap_*` backed by PyRFC |
| Explicit administrator diagnosis of an upstream | Temporarily enabled `sap-abap_*` or `sap-pyrfc_*` tools |

Use only tools exposed in the current catalog; capability filtering is intentional. If a Bowi tool is missing or returns a subject/profile/capability error, report that condition. Do not silently enable or fall back to a direct SAP MCP server.

## Personal Todo through Bowi

- The verified BuildingAI subject is the actor. Never ask for or pass `userId`, `creatorId`, or another identity field.
- Search with `bowi_todo_search`. Visibility is already limited to items created by or assigned to the current user.
- Before `bowi_todo_update`, `bowi_todo_set_progress`, or `bowi_todo_delete`, search for the item and pass its current `id` and `updatedAt` as `todoId` and `expectedUpdatedAt`.
- Use `bowi_todo_search_assignees` to resolve an assignee; do not invent an `assigneeId`.
- `bowi_todo_update` and `bowi_todo_delete` are creator-only. Creator or assignee may use `bowi_todo_set_progress`.
- Progress `100` completes the Todo and sets its completion time. Any value below `100` keeps or returns it to in-progress and clears the completion time.
- Obtain explicit user confirmation immediately before `bowi_todo_delete`.
- On a stale-update conflict, search again and present the current item before deciding whether to retry.

## SAP through Bowi

- Use the exact `bowi_sap_*` schema exposed by OpenCode. Bowi accepts domain fields such as `tableName`, `functionName`, and `objectSourceUrl`; it does not accept upstream naming or infrastructure fields.
- Never pass an SAP username, password, host, client, `connection_id`, `lockHandle`, or upstream tool name to a Bowi tool. Bowi resolves profiles and owns upstream sessions internally.
- Use `bowi_sap_search_objects` before `bowi_sap_get_object_source` when an ADT source URL is not already known.
- Use `bowi_sap_read_table` for bounded table reads and `bowi_sap_get_rfc_function_description` before an unfamiliar RFC/BAPI call.
- Treat `bowi_sap_call_rfc`, source writes, activation, and transport creation as potentially state-changing. Validate the target and arguments against the user's explicit intent. Never automatically retry an RFC/BAPI or SAP write after an uncertain result.
- `bowi_sap_healthcheck` checks both adapters for the verified user. An adapter reported as `unavailable` can mean a missing profile or disabled service-profile mode even when its process is online.

## Direct SAP diagnostics

Direct `sap-abap` and `sap-pyrfc` entries are absent from ordinary OpenCode configuration and are not an alternate business path. Use them only when the user explicitly requests administrator-level upstream diagnosis. Before doing so, read [direct-sap-diagnostics.md](references/direct-sap-diagnostics.md) and follow the protocol for the selected server.

Do not mix direct handles, credentials, schemas, or tool names with Bowi calls.
