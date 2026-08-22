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

describe("AgentChatRecordService.getStats", () => {
    it("counts only active non-debug conversations", async () => {
        const queryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ conversationCount: "11", messageCount: "42" }),
        };
        const chatRecords = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        const service = new AgentChatRecordService(
            chatRecords as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );

        await expect(service.getStats("agent", "user")).resolves.toEqual({
            conversationCount: 11,
            messageCount: 42,
        });
        expect(queryBuilder.andWhere).toHaveBeenCalledWith("r.archivedAt IS NULL");
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
            "(r.metadata ->> 'isDebug') IS DISTINCT FROM 'true'",
        );
    });
});
