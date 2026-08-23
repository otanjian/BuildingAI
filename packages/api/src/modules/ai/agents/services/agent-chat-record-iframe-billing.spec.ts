jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("uuid", () => ({ validate: () => true }));

import { AgentChatRecord } from "@buildingai/db/entities";

import { AgentChatRecordService } from "./agent-chat-record.service";

describe("AgentChatRecordService iframe billing boundary", () => {
    it("initializes the boundary under a row lock", async () => {
        const manager = {
            findOne: jest.fn(async () => ({
                id: "conversation-1",
                isDeleted: false,
                metadata: { provider: "opencode" },
            })),
            update: jest.fn(async () => ({ affected: 1 })),
        };
        const records = {
            manager: {
                transaction: jest.fn(async (callback: (value: any) => unknown) =>
                    callback(manager),
                ),
            },
        };
        const service = new AgentChatRecordService(
            records as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );

        const state = await service.initializeOpencodeIframeBilling("conversation-1");

        expect(manager.findOne).toHaveBeenCalledWith(AgentChatRecord, {
            where: { id: "conversation-1", isDeleted: false },
            lock: { mode: "pessimistic_write" },
        });
        expect(state).toMatchObject({ version: 1, totalTokens: 0, consumedPower: 0 });
        expect(manager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation-1" },
            expect.objectContaining({
                metadata: expect.objectContaining({
                    provider: "opencode",
                    opencodeIframeBilling: state,
                }),
            }),
        );
    });

    it("preserves an existing boundary without writing it again", async () => {
        const existing = {
            version: 1,
            startedAt: "2026-08-23T04:00:00.000Z",
            inputTokens: 10,
            outputTokens: 2,
            totalTokens: 12,
            consumedPower: 1,
            settledTurns: 1,
        };
        const manager = {
            findOne: jest.fn(async () => ({
                id: "conversation-1",
                isDeleted: false,
                metadata: { opencodeIframeBilling: existing },
            })),
            update: jest.fn(),
        };
        const records = {
            manager: {
                transaction: jest.fn(async (callback: (value: any) => unknown) =>
                    callback(manager),
                ),
            },
        };
        const service = new AgentChatRecordService(
            records as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );

        await expect(
            service.initializeOpencodeIframeBilling("conversation-1"),
        ).resolves.toStrictEqual(existing);
        expect(manager.update).not.toHaveBeenCalled();
    });
});
