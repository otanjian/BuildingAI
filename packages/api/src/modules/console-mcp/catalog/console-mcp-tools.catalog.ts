export type ConsoleMcpToolAuthContext = {
    isRoot: boolean | number;
    permissions: string[];
};

function isRootUser(isRoot: boolean | number): boolean {
    return isRoot === true || isRoot === 1;
}

export type ConsoleMcpToolDefinition = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    /** Empty + authOnly means any authenticated user may call (e.g. create_agent). */
    requiredPermissions: string[];
    authOnly?: boolean;
};

export const CONSOLE_MCP_SERVER_NAME = "buildingai-console-mcp";

export const CONSOLE_MCP_TOOL_CATALOG: ConsoleMcpToolDefinition[] = [
    {
        name: "console_list_agents",
        description: "List agents from the console (paginated). Requires agents:list.",
        inputSchema: {
            type: "object",
            properties: {
                page: { type: "number", description: "Page number (1-based)" },
                pageSize: { type: "number", description: "Page size" },
                name: { type: "string", description: "Filter by agent name" },
                status: {
                    type: "string",
                    description: "Square publish status filter",
                },
                tagId: { type: "string", description: "Filter by tag UUID" },
            },
            additionalProperties: false,
        },
        requiredPermissions: ["agents:list"],
    },
    {
        name: "console_list_mcp_servers",
        description: "List system MCP servers from the console. Requires ai-mcp-servers:list.",
        inputSchema: {
            type: "object",
            properties: {
                page: { type: "number" },
                pageSize: { type: "number" },
                name: { type: "string" },
                isDisabled: { type: "boolean" },
            },
            additionalProperties: false,
        },
        requiredPermissions: ["ai-mcp-servers:list"],
    },
    {
        name: "create_agent",
        description:
            "Create an agent for the authenticated user (same as web create agent). No extra console permission code.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string" },
                description: { type: "string" },
                avatar: { type: "string" },
                createMode: { type: "string", enum: ["direct", "coze", "dify"] },
                modelConfig: { type: "object" },
                thirdPartyIntegration: { type: "object" },
                tagIds: { type: "array", items: { type: "string" } },
            },
            required: ["name"],
            additionalProperties: false,
        },
        requiredPermissions: [],
        authOnly: true,
    },
];

export function userCanCallConsoleMcpTool(
    tool: ConsoleMcpToolDefinition,
    user: ConsoleMcpToolAuthContext,
): boolean {
    if (isRootUser(user.isRoot)) {
        return true;
    }
    if (tool.authOnly || tool.requiredPermissions.length === 0) {
        return true;
    }
    return tool.requiredPermissions.every((code) => user.permissions.includes(code));
}

export function filterConsoleMcpToolsForUser(
    catalog: ConsoleMcpToolDefinition[],
    user: ConsoleMcpToolAuthContext,
): ConsoleMcpToolDefinition[] {
    return catalog.filter((tool) => userCanCallConsoleMcpTool(tool, user));
}
