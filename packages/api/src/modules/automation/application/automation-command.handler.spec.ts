import { FeishuAutomationCommandHandler } from "./automation-command.handler";

jest.mock("@buildingai/cache", () => ({ RedisService: class RedisService {} }));
jest.mock("../mcp/automation-bowi.provider", () => ({ AutomationBowiProvider: class AutomationBowiProvider {} }));
jest.mock("../infrastructure/feishu-automation.adapter", () => ({ FeishuAutomationAdapter: class FeishuAutomationAdapter {} }));

describe("FeishuAutomationCommandHandler natural-language flow", () => {
    const config = {
        connectionId: "connection-1",
        agentId: "agent-1",
    } as any;
    const event = (text: string, actor = "open-u1", eventId = "event-1") => ({
        event_id: eventId,
        sender: { sender_type: "user", sender_id: { open_id: actor } },
        message: { message_id: eventId, chat_id: "chat-1", chat_type: "p2p", message_type: "text", content: text },
    }) as any;

    function makeHandler() {
        const pending = new Map<string, any>();
        const confirmations = {
            save: jest.fn(async (context: any, command: any, preview: string) => pending.set(`${context.actorId}:${context.conversationId}`, { command, preview })),
            consume: jest.fn(async (context: any) => pending.get(`${context.actorId}:${context.conversationId}`)),
        };
        const provider = {
            executeForChannel: jest.fn()
                .mockImplementation(async (name: string) => {
                    if (name === "automation_create") return { id: "job-1", name: "采购情况", schedule: { kind: "cron", expression: "25 7 * * *", timezone: "Asia/Shanghai" }, timezone: "Asia/Shanghai", nextRunAt: new Date("2030-01-01T23:25:00.000Z") };
                    if (name === "automation_run") return { runId: "run-1" };
                    return [];
                }),
        };
        const adapter = { replyToInteraction: jest.fn().mockResolvedValue({ status: "delivered" }) };
        const handler = new FeishuAutomationCommandHandler(new (require("./automation-command.parser").AutomationCommandParser)(), new (require("./automation-intent.parser").AutomationIntentParser)(), confirmations as any, provider as any, adapter as any);
        return { handler, confirmations, provider, adapter };
    }

    it("previews, then creates and smoke-runs only after confirmation", async () => {
        const { handler, confirmations, provider, adapter } = makeHandler();
        await expect(handler.handle(config, event("生成一个定时任务，每天7:25，给我发送当前公司的采购情况"), "生成一个定时任务，每天7:25，给我发送当前公司的采购情况", "event-1")).resolves.toBe(true);
        expect(provider.executeForChannel).not.toHaveBeenCalledWith("automation_create", expect.anything(), expect.anything(), expect.anything());
        expect(confirmations.save).toHaveBeenCalledTimes(1);
        expect(adapter.replyToInteraction.mock.calls[0][1]).toContain("回复“确认”创建");

        await expect(handler.handle(config, event("确认", "open-u1", "event-2"), "确认", "event-2")).resolves.toBe(true);
        expect(provider.executeForChannel).toHaveBeenCalledWith("automation_create", expect.anything(), expect.anything(), expect.anything());
        expect(provider.executeForChannel).toHaveBeenCalledWith("automation_run", { taskId: "job-1", idempotencyKey: "smoke:event-2" }, expect.objectContaining({ conversationId: "chat-1" }), expect.anything());
    });

    it("does not create for ordinary chat or a cancelled preview", async () => {
        const { handler, provider, confirmations } = makeHandler();
        await expect(handler.handle(config, event("帮我看看采购订单"), "帮我看看采购订单", "event-1")).resolves.toBe(false);
        await handler.handle(config, event("每天7:25发送采购情况"), "每天7:25发送采购情况", "event-2");
        await expect(handler.handle(config, event("取消", "open-u1", "event-3"), "取消", "event-3")).resolves.toBe(true);
        expect(provider.executeForChannel).not.toHaveBeenCalledWith("automation_create", expect.anything(), expect.anything(), expect.anything());
        expect(confirmations.consume).toHaveBeenCalledTimes(1);
    });

    it("uses the matched Bowi AI user as the automation creator", async () => {
        const { handler, provider } = makeHandler();

        await expect(
            handler.handle(
                config,
                event("/tasks"),
                "/tasks",
                "event-user-match",
                { localUserId: "buildingai-user-1", displayName: "谭建" },
            ),
        ).resolves.toBe(true);

        expect(provider.executeForChannel).toHaveBeenCalledWith(
            "automation_search",
            {},
            expect.objectContaining({ actorId: "buildingai-user-1" }),
            expect.anything(),
        );
    });
});
