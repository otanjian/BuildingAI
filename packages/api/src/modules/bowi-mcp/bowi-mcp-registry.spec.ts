import { BowiMcpRegistry } from "./services/bowi-mcp-registry.service";
import type { BowiMcpProvider, BowiPrincipal } from "./types/bowi-mcp.types";

const tool = (name: string) => ({
    name,
    description: `${name} description`,
    inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false as const,
    },
    capability: "todo.personal" as const,
    execute: jest.fn().mockResolvedValue({ ok: true }),
});

describe("BowiMcpRegistry", () => {
    it("builds a deterministic stable catalog", () => {
        const provider: BowiMcpProvider = { namespace: "todo", tools: [tool("todo_update"), tool("todo_search")] };
        const registry = new BowiMcpRegistry([provider]);

        expect(registry.list().map((item) => item.name)).toEqual(["todo_search", "todo_update"]);
        expect(registry.list()[0]).not.toHaveProperty("execute");
    });

    it("rejects duplicate tool names", () => {
        const first: BowiMcpProvider = { namespace: "one", tools: [tool("todo_search")] };
        const second: BowiMcpProvider = { namespace: "two", tools: [tool("todo_search")] };
        expect(() => new BowiMcpRegistry([first, second])).toThrow("Duplicate Bowi MCP tool");
    });

    it("filters discovery by the principal's capabilities", () => {
        const sap = { ...tool("sap_read"), capability: "sap.read" as const };
        const registry = new BowiMcpRegistry([{ namespace: "mixed", tools: [tool("todo_search"), sap] }]);
        const principal: BowiPrincipal = {
            actor: { kind: "runtime", id: "managed-opencode" },
            authSource: "opencode_session",
            capabilities: new Set(["todo.personal"]),
        };

        expect(registry.list(principal).map((item) => item.name)).toEqual(["todo_search"]);
    });

    it("rejects model-supplied identity fields through schema validation", () => {
        const registry = new BowiMcpRegistry([{ namespace: "todo", tools: [tool("todo_search")] }]);
        expect(() => registry.validateArguments("todo_search", { userId: "forged" })).toThrow(
            "Invalid tool arguments",
        );
    });

    it("enforces UUID, date, and date-time formats", () => {
        const formattedTool = {
            ...tool("todo_update"),
            inputSchema: {
                type: "object" as const,
                properties: {
                    todoId: { type: "string", format: "uuid" },
                    plannedCompletionDate: { type: "string", format: "date" },
                    expectedUpdatedAt: { type: "string", format: "date-time" },
                },
                required: ["todoId", "plannedCompletionDate", "expectedUpdatedAt"],
                additionalProperties: false as const,
            },
        };
        const registry = new BowiMcpRegistry([{ namespace: "todo", tools: [formattedTool] }]);

        expect(() =>
            registry.validateArguments("todo_update", {
                todoId: "not-a-uuid",
                plannedCompletionDate: "2026-02-30",
                expectedUpdatedAt: "yesterday",
            }),
        ).toThrow("Invalid tool arguments");
    });
});
