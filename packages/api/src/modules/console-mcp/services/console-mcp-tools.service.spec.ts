import {
    CONSOLE_MCP_TOOL_CATALOG,
    filterConsoleMcpToolsForUser,
    userCanCallConsoleMcpTool,
} from "../catalog/console-mcp-tools.catalog";

describe("console mcp tools permission gating", () => {
    it("list hides unauthorized tools", () => {
        const listed = filterConsoleMcpToolsForUser(CONSOLE_MCP_TOOL_CATALOG, {
            isRoot: false,
            permissions: ["ai-mcp-servers:list"],
        });
        expect(listed.map((t) => t.name)).toEqual(
            expect.arrayContaining(["console_list_mcp_servers", "create_agent"]),
        );
        expect(listed.map((t) => t.name)).not.toContain("console_list_agents");
    });

    it("call without permission fails before side effects", () => {
        const tool = CONSOLE_MCP_TOOL_CATALOG.find((t) => t.name === "console_list_agents")!;
        const allowed = userCanCallConsoleMcpTool(tool, {
            isRoot: false,
            permissions: [],
        });
        expect(allowed).toBe(false);
    });

    it("create_agent is allowed for any authenticated non-root user", () => {
        const tool = CONSOLE_MCP_TOOL_CATALOG.find((t) => t.name === "create_agent")!;
        expect(
            userCanCallConsoleMcpTool(tool, {
                isRoot: false,
                permissions: [],
            }),
        ).toBe(true);
    });
});
