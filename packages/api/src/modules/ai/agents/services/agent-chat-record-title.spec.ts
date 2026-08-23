jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("uuid", () => ({ validate: () => true }));

import { AgentChatRecordService } from "./agent-chat-record.service";

describe("AgentChatRecordService OpenCode title synchronization", () => {
    it("updates a generated title only while the local title is a placeholder", async () => {
        const records = {
            update: jest.fn(async () => ({ affected: 1 })),
        };
        const service = new AgentChatRecordService(
            records as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );

        await expect(
            service.syncGeneratedOpencodeTitle("conversation-1", "  采购订单分析  "),
        ).resolves.toBe(true);

        expect(records.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: "conversation-1", isDeleted: false }),
            { title: "采购订单分析" },
        );
    });

    it.each([
        "",
        "新对话",
        "New conversation",
        "Bowi AI conversation",
        "New session - 2026-08-22T00:00:00.000Z",
    ])("rejects non-meaningful remote title %p", async (title) => {
        const records = { update: jest.fn() };
        const service = new AgentChatRecordService(
            records as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );

        await expect(service.syncGeneratedOpencodeTitle("conversation-1", title)).resolves.toBe(
            false,
        );
        expect(records.update).not.toHaveBeenCalled();
    });
});
