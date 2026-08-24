import { Injectable, Logger } from "@nestjs/common";

import type {
    BowiCapability,
    BowiMcpProvider,
    BowiMcpTool,
    BowiPrincipal,
} from "../types/bowi-mcp.types";
import { SapAdtMcpAdapter } from "./sap-adt-mcp.adapter";
import { SapPyrfcMcpAdapter } from "./sap-pyrfc-mcp.adapter";

const string = (description: string, options: Record<string, unknown> = {}) => ({
    type: "string",
    description,
    ...options,
});
const integer = (description: string, options: Record<string, unknown> = {}) => ({
    type: "integer",
    description,
    ...options,
});

@Injectable()
export class SapBowiProvider implements BowiMcpProvider {
    readonly bowiMcpProvider = true as const;
    readonly namespace = "sap";
    readonly tools: BowiMcpTool[];
    private readonly logger = new Logger(SapBowiProvider.name);

    constructor(
        private readonly adt: SapAdtMcpAdapter,
        private readonly pyrfc: SapPyrfcMcpAdapter,
    ) {
        this.tools = [
            this.tool(
                "sap_healthcheck",
                "Check configured SAP ADT and PyRFC upstream availability for the verified user.",
                {},
                [],
                "sap.read",
                "mixed",
                (args, principal) => this.health(principal, args),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
            ),
            this.adtTool(
                "sap_search_objects",
                "Search SAP repository objects through ADT.",
                {
                    query: string("Repository object search query", { minLength: 1 }),
                    objectType: string("Optional ADT object type"),
                    maxResults: integer("Maximum results", { minimum: 1, maximum: 100, default: 20 }),
                },
                ["query"],
                "sap.read",
                "searchObject",
                (args) => ({ query: args.query, objType: args.objectType, max: args.maxResults }),
                true,
            ),
            this.adtTool(
                "sap_get_object_source",
                "Read ABAP object source through ADT.",
                {
                    objectSourceUrl: string("ADT object source URL", { minLength: 1 }),
                    options: string("Optional ADT source options"),
                },
                ["objectSourceUrl"],
                "sap.read",
                "getObjectSource",
                (args) => args,
                true,
            ),
            this.tool(
                "sap_read_table",
                "Read rows from an SAP table using the verified user's PyRFC profile.",
                {
                    tableName: string("SAP table or view name", { pattern: "^[A-Za-z0-9_/$]+$" }),
                    fields: { type: "array", items: { type: "string" }, maxItems: 100 },
                    where: string("RFC_READ_TABLE where clause"),
                    rowCount: integer("Maximum rows", { minimum: 1, maximum: 1000, default: 20 }),
                    rowSkip: integer("Rows to skip", { minimum: 0, default: 0 }),
                },
                ["tableName"],
                "sap.read",
                "pyrfc",
                (args, principal) =>
                    this.pyrfc.readTable(principal, {
                        table_name: String(args.tableName).toUpperCase(),
                        fields: Array.isArray(args.fields) ? args.fields.join(",") : "",
                        where: args.where ?? "",
                        row_count: args.rowCount ?? 20,
                        row_skip: args.rowSkip ?? 0,
                    }),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
            ),
            this.adtTool(
                "sap_run_query",
                "Run a freestyle SQL query through ADT datapreview. Supports aggregation "
                    + "(COUNT/SUM/AVG/MAX/MIN), GROUP BY, and ORDER BY ... DESC. "
                    + "Use for analytics over SAP tables/views. Read-only.",
                {
                    sqlQuery: string("Freestyle SQL query text", { minLength: 1 }),
                    rowCount: integer("Maximum rows", { minimum: 1, maximum: 500, default: 100 }),
                    decode: { type: "boolean", description: "Whether to decode the result", default: true },
                },
                ["sqlQuery"],
                "sap.read",
                "runQuery",
                (args) => ({ sqlQuery: args.sqlQuery, rowNumber: args.rowCount ?? 100, decode: args.decode ?? true }),
                true,
            ),
            this.tool(
                "sap_get_rfc_function_description",
                "Get metadata for an approved SAP RFC or BAPI function.",
                { functionName: string("RFC or BAPI function name", { pattern: "^[A-Za-z0-9_/$]+$" }) },
                ["functionName"],
                "sap.rfc",
                "pyrfc",
                (args, principal) =>
                    this.pyrfc.getFunctionDescription(principal, {
                        function_name: String(args.functionName).toUpperCase(),
                    }),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
            ),
            this.tool(
                "sap_call_rfc",
                "Call an allowlisted SAP RFC or BAPI. Unrestricted names require sap.rfc.admin.",
                {
                    functionName: string("RFC or BAPI function name", { pattern: "^[A-Za-z0-9_/$]+$" }),
                    parameters: { type: "object", description: "Function parameters", additionalProperties: true },
                },
                ["functionName"],
                "sap.rfc",
                "pyrfc",
                (args, principal) =>
                    this.pyrfc.callRfc(principal, {
                        function_name: String(args.functionName).toUpperCase(),
                        parameters_json: JSON.stringify(args.parameters ?? {}),
                    }),
                { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
            ),
            this.adtTool(
                "sap_set_object_source",
                "Update ABAP object source through an internal lock/write/unlock ADT transaction.",
                {
                    objectSourceUrl: string("ADT object source URL", { minLength: 1 }),
                    source: string("Complete ABAP object source", { minLength: 1 }),
                    transport: string("Optional transport request"),
                },
                ["objectSourceUrl", "source"],
                "sap.write",
                "setObjectSource",
                (args) => args,
                false,
                (args, principal) =>
                    this.adt.updateObjectSource(principal, {
                        objectSourceUrl: String(args.objectSourceUrl),
                        source: String(args.source),
                        transport: args.transport,
                    }),
            ),
            this.adtTool(
                "sap_activate_objects",
                "Activate explicitly identified ABAP objects through ADT.",
                {
                    objects: { type: "array", items: { type: "object", additionalProperties: true }, minItems: 1, maxItems: 50 },
                    preauditRequested: { type: "boolean", default: true },
                },
                ["objects"],
                "sap.write",
                "activateObjects",
                (args) => ({ objects: JSON.stringify(args.objects), preauditRequested: args.preauditRequested ?? true }),
                false,
            ),
            this.adtTool(
                "sap_get_transport",
                "Get transport information for an ADT object source.",
                {
                    objectSourceUrl: string("ADT object source URL", { minLength: 1 }),
                    packageName: string("Development package"),
                    operation: string("Transport operation"),
                },
                ["objectSourceUrl"],
                "sap.transport",
                "transportInfo",
                (args) => ({ objSourceUrl: args.objectSourceUrl, devClass: args.packageName, operation: args.operation }),
                true,
            ),
            this.adtTool(
                "sap_create_transport",
                "Create an SAP transport request through ADT.",
                {
                    objectSourceUrl: string("ADT object source URL", { minLength: 1 }),
                    description: string("Transport description", { minLength: 1, maxLength: 120 }),
                    packageName: string("Development package", { minLength: 1 }),
                    transportLayer: string("Optional transport layer"),
                },
                ["objectSourceUrl", "description", "packageName"],
                "sap.transport",
                "createTransport",
                (args) => ({
                    objSourceUrl: args.objectSourceUrl,
                    REQUEST_TEXT: args.description,
                    DEVCLASS: args.packageName,
                    transportLayer: args.transportLayer,
                }),
                false,
            ),
        ];
    }

    private async health(principal: BowiPrincipal, _args: Record<string, unknown>) {
        const [adt, pyrfc] = await Promise.allSettled([
            this.adt.call(principal, "healthcheck", {}),
            this.pyrfc.health(principal),
        ]);
        return {
            adt: adt.status === "fulfilled" ? { status: "ok", result: adt.value } : { status: "unavailable" },
            pyrfc: pyrfc.status === "fulfilled" ? { status: "ok", result: pyrfc.value } : { status: "unavailable" },
        };
    }

    private adtTool(
        name: string,
        description: string,
        properties: Record<string, unknown>,
        required: string[],
        capability: BowiCapability,
        upstream: string,
        map: (args: Record<string, unknown>) => Record<string, unknown>,
        readOnly: boolean,
        execute?: BowiMcpTool["execute"],
    ) {
        return this.tool(
            name,
            description,
            properties,
            required,
            capability,
            "adt",
            execute ??
                ((args, principal) =>
                    this.adt.call(principal, upstream, this.compact(map(args)))),
            {
                readOnlyHint: readOnly,
                destructiveHint: !readOnly,
                idempotentHint: readOnly,
                openWorldHint: true,
            },
        );
    }

    private tool(
        name: string,
        description: string,
        properties: Record<string, unknown>,
        required: string[],
        capability: BowiCapability,
        adapter: "adt" | "pyrfc" | "mixed",
        execute: BowiMcpTool["execute"],
        annotations: BowiMcpTool["annotations"],
    ): BowiMcpTool {
        return {
            name,
            description,
            inputSchema: {
                type: "object",
                properties,
                ...(required.length ? { required } : {}),
                additionalProperties: false,
            },
            annotations,
            capability,
            execute: async (args, principal) => {
                const started = Date.now();
                try {
                    const result = await execute(args, principal);
                    this.audit(name, adapter, principal, "success", Date.now() - started);
                    return result;
                } catch (error) {
                    this.audit(name, adapter, principal, "failed", Date.now() - started);
                    throw error;
                }
            },
        };
    }

    private audit(tool: string, adapter: string, principal: BowiPrincipal, outcome: string, durationMs: number): void {
        this.logger.log(
            JSON.stringify({
                event: "bowi.sap.tool",
                tool,
                adapter,
                subjectUserId: principal.subjectUserId,
                actorId: principal.actor.id,
                agentId: principal.agentId,
                conversationId: principal.conversationId,
                callId: principal.callId,
                outcome,
                durationMs,
            }),
        );
    }

    private compact(value: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
    }
}
