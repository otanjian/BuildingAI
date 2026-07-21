import {
    CONSOLE_MCP_TOOL_CATALOG,
    filterConsoleMcpToolsForUser,
    type ConsoleMcpToolDefinition,
} from "./console-mcp-tools.catalog";

describe("console-mcp-tools.catalog", () => {
    const catalog: ConsoleMcpToolDefinition[] = CONSOLE_MCP_TOOL_CATALOG;

    it("defines phase-1 tools with expected permission gates", () => {
        const byName = Object.fromEntries(catalog.map((t) => [t.name, t]));
        expect(byName.console_list_agents?.requiredPermissions).toEqual(["agents:list"]);
        expect(byName.console_list_mcp_servers?.requiredPermissions).toEqual([
            "ai-mcp-servers:list",
        ]);
        expect(byName.create_agent?.requiredPermissions).toEqual([]);
        expect(byName.create_agent?.authOnly).toBe(true);
    });

    it("hides tools the user cannot call and keeps create_agent for any authenticated user", () => {
        const visible = filterConsoleMcpToolsForUser(catalog, {
            isRoot: false,
            permissions: [],
        });
        expect(visible.map((t) => t.name)).toEqual(["create_agent"]);
    });

    it("shows agents list tool when user has agents:list", () => {
        const visible = filterConsoleMcpToolsForUser(catalog, {
            isRoot: false,
            permissions: ["agents:list"],
        });
        expect(visible.map((t) => t.name)).toEqual(
            expect.arrayContaining(["console_list_agents", "create_agent"]),
        );
        expect(visible.map((t) => t.name)).not.toContain("console_list_mcp_servers");
    });

    it("shows all phase-1 tools for root users", () => {
        const visible = filterConsoleMcpToolsForUser(catalog, {
            isRoot: true,
            permissions: [],
        });
        expect(visible.map((t) => t.name).sort()).toEqual(
            ["console_list_agents", "console_list_mcp_servers", "create_agent"].sort(),
        );
    });
});
