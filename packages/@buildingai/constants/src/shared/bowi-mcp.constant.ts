/** Unified BuildingAI enterprise MCP server (hosted on ehcs-ai extension HTTP route). */
export const BOWI_MCP_SERVER_NAME = "bowi-mcp";

export type BowiMcpToolDefinition = {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
};

const APP_ID_PROP = {
    appId: {
        type: "string",
        description:
            'Target application id (e.g. "inv-opt-ai", "ehcs-ai"). Required on every bowi-mcp tool call.',
    },
};

export const BOWI_MCP_TOOL_CATALOG: BowiMcpToolDefinition[] = [
    {
        name: "bowi_start_full_check",
        description:
            "Start a full check run for the given appId: load enabled rules and create a batch. Call FIRST when the user asks for the app's trigger phrase (e.g. 开始检查 / 开始分析).",
        inputSchema: {
            type: "object",
            properties: { ...APP_ID_PROP },
            required: ["appId"],
        },
    },
    {
        name: "bowi_get_check_progress",
        description:
            "Get progress of a check run for appId. Omit runId for the active running batch.",
        inputSchema: {
            type: "object",
            properties: {
                ...APP_ID_PROP,
                runId: { type: "number", description: "Check run id; omit for active batch" },
            },
            required: ["appId"],
        },
    },
    {
        name: "bowi_cancel_check",
        description: "Cancel an in-progress check run for appId. Omit runId to cancel the active batch.",
        inputSchema: {
            type: "object",
            properties: {
                ...APP_ID_PROP,
                runId: { type: "number", description: "Check run id; omit for active batch" },
            },
            required: ["appId"],
        },
    },
    {
        name: "bowi_ingest_rule_result",
        description:
            "Persist one rule's JSON check result for appId after ERP validation. Call once per rule with runId, ruleId, assistantText.",
        inputSchema: {
            type: "object",
            properties: {
                ...APP_ID_PROP,
                runId: { type: "number" },
                ruleId: { type: "string" },
                assistantText: { type: "string" },
            },
            required: ["appId", "runId", "ruleId", "assistantText"],
        },
    },
    {
        name: "bowi_sql_query",
        description:
            "Read-only SELECT within the appId schema scope (allowed tables only). Single statement; use $1,$2 for params.",
        inputSchema: {
            type: "object",
            properties: {
                ...APP_ID_PROP,
                sql: { type: "string" },
                params: { type: "array", items: { type: "string" } },
            },
            required: ["appId", "sql"],
        },
    },
    {
        name: "bowi_sql_execute",
        description:
            "INSERT/UPDATE/DELETE within the appId schema scope (allowed tables only). Single statement; prefer bowi_ingest_rule_result for check ingest.",
        inputSchema: {
            type: "object",
            properties: {
                ...APP_ID_PROP,
                sql: { type: "string" },
                params: { type: "array", items: { type: "string" } },
            },
            required: ["appId", "sql"],
        },
    },
];

/** Streamable HTTP MCP endpoint (ehcs-ai hosts bowi-mcp for all enterprise apps). */
export function getBowiMcpPublicUrl(): string {
    const base =
        process.env.BOWI_MCP_BASE_URL?.trim() ||
        process.env.EHCS_MCP_BASE_URL?.trim() ||
        (process.env.NODE_ENV === "production"
            ? process.env.VITE_PRODUCTION_APP_BASE_URL?.trim() ||
              process.env.APP_DOMAIN?.trim()
            : undefined) ||
        process.env.VITE_DEVELOP_APP_BASE_URL?.trim() ||
        `http://127.0.0.1:${process.env.SERVER_PORT || "4090"}`;
    const prefix = process.env.VITE_APP_CONSOLE_API_PREFIX || "/consoleapi";
    return `${base.replace(/\/$/, "")}/ehcs-ai${prefix}/bowi-mcp/mcp`;
}
