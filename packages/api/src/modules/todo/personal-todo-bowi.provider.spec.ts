jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { PersonalTodoBowiProvider } from "./mcp/personal-todo-bowi.provider";

describe("PersonalTodoBowiProvider", () => {
    const userId = "0d475e32-9af6-4fd6-9562-c49d4f962fde";
    const todoId = "764499c8-19a7-4357-ac2c-1a81830c6c18";
    const expectedUpdatedAt = "2026-08-23T10:00:00.000Z";

    function harness() {
        const service = {
            list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
            searchAssignees: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: todoId }),
            update: jest.fn().mockResolvedValue({ id: todoId }),
            updateProgress: jest.fn().mockResolvedValue({ id: todoId, progress: 80 }),
            remove: jest.fn().mockResolvedValue({ id: todoId }),
        };
        const provider = new PersonalTodoBowiProvider(service as never);
        const call = (name: string, args: Record<string, unknown>) =>
            provider.tools.find((item) => item.name === name)!.execute(args, {
                subjectUserId: userId,
                actor: { kind: "user", id: userId },
                authSource: "login",
                capabilities: new Set(["todo.personal"]),
            });
        return { service, provider, call };
    }

    it("exposes six domain-prefixed tools without identity fields", () => {
        const { provider } = harness();
        expect(provider.tools.map((item) => item.name)).toEqual([
            "todo_search",
            "todo_search_assignees",
            "todo_create",
            "todo_update",
            "todo_set_progress",
            "todo_delete",
        ]);
        for (const tool of provider.tools) {
            expect(tool.inputSchema.properties).not.toHaveProperty("userId");
            expect(tool.inputSchema.additionalProperties).toBe(false);
        }
        expect(provider.tools.find((item) => item.name === "todo_delete")?.annotations).toMatchObject({
            destructiveHint: true,
        });
    });

    it("translates relationship search to the verified user", async () => {
        const { call, service } = harness();
        await call("todo_search", { relationship: "assigned_to_me", status: "all", pageSize: 10 });
        expect(service.list).toHaveBeenCalledWith(
            userId,
            expect.objectContaining({ assigneeId: userId, tab: "all", pageSize: 10 }),
        );
    });

    it("delegates mutations with the verified subject and optimistic version", async () => {
        const { call, service } = harness();
        await call("todo_update", { todoId, title: "Updated", expectedUpdatedAt });
        await call("todo_set_progress", { todoId, progress: 80, expectedUpdatedAt });
        await call("todo_delete", { todoId, expectedUpdatedAt });

        expect(service.update).toHaveBeenCalledWith(userId, todoId, {
            title: "Updated",
            expectedUpdatedAt,
        });
        expect(service.updateProgress).toHaveBeenCalledWith(userId, todoId, 80, expectedUpdatedAt);
        expect(service.remove).toHaveBeenCalledWith(userId, todoId, expectedUpdatedAt);
    });

    it("delegates creation and assignee discovery with the verified subject", async () => {
        const { call, service } = harness();
        await call("todo_create", { title: "Prepare report" });
        await call("todo_search_assignees", { keyword: "Rock", limit: 5 });

        expect(service.create).toHaveBeenCalledWith(userId, { title: "Prepare report" });
        expect(service.searchAssignees).toHaveBeenCalledWith(userId, "Rock", 5);
    });
});
