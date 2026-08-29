import { AutomationCommandParser } from "./automation-command.parser";

describe("AutomationCommandParser", () => {
    it("parses explicit schedule commands", () => {
        const command = new AutomationCommandParser().parse(
            '/schedule name="Daily report" every="3600" timezone="Asia/Shanghai" prompt="Check orders"',
            "event-1",
        );
        expect(command?.operation).toBe("create");
        expect(command?.schedule).toMatchObject({ kind: "every", intervalSeconds: 3600 });
    });

    it("does not interpret ordinary natural language", () => {
        expect(new AutomationCommandParser().parse("提醒我明天查库存", "event-1")).toBeUndefined();
    });

    it("parses idempotent task management commands", () => {
        expect(new AutomationCommandParser().parse("/tasks pause task-1", "event-1")).toEqual({
            operation: "pause",
            taskId: "task-1",
            idempotencyKey: "event-1",
        });
    });
});
