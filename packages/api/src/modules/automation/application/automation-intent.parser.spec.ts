import { AutomationIntentParser } from "./automation-intent.parser";

describe("AutomationIntentParser", () => {
    const parser = new AutomationIntentParser();

    it("normalizes a daily Chinese request into the shared create DTO", () => {
        const intent = parser.parse("生成一个定时任务，每天7:25，给我发送当前公司的采购情况");

        expect(intent).toMatchObject({
            status: "ready",
            command: {
                operation: "create",
                name: "采购情况",
                prompt: "当前公司的采购情况",
                schedule: {
                    kind: "cron",
                    expression: "25 7 * * *",
                    timezone: "Asia/Shanghai",
                },
            },
        });
    });

    it("asks for missing schedule fields instead of producing a job", () => {
        const intent = parser.parse("提醒我每天发送采购情况");

        expect(intent.status).toBe("clarification");
        expect(intent.command.operation).toBe("create");
        expect(intent.missing).toContain("time");
    });

    it("does not hijack ordinary chat", () => {
        expect(parser.parse("帮我看一下采购订单")).toBeUndefined();
        expect(AutomationIntentParser.isReservedInteraction("每天销量是多少？")).toBe(false);
        expect(
            AutomationIntentParser.isReservedInteraction(
                "生成一个定时任务，每天7:25，给我发送当前公司的采购情况",
            ),
        ).toBe(true);
    });

    it("recognizes explicit confirmations and cancellation", () => {
        expect(AutomationIntentParser.isConfirmation("确认创建")).toBe(true);
        expect(AutomationIntentParser.isCancellation("取消")).toBe(true);
        expect(AutomationIntentParser.isConfirmation("确认一下采购数据")).toBe(false);
        expect(AutomationIntentParser.isCancellation("不要了")).toBe(true);
    });
});
