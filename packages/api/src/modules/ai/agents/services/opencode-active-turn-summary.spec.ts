jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("uuid", () => ({ validate: () => true }));

import { AgentOpencodeTurn } from "@buildingai/db/entities";

import { AgentChatRecordService } from "./agent-chat-record.service";

describe("OpenCode active turn conversation summaries", () => {
    function harness(turns: Array<Record<string, unknown>>) {
        const turnRepository = {
            find: jest.fn(async () => turns),
            findOne: jest.fn(async () => turns[0] ?? null),
        };
        const chatRecords = {
            manager: {
                getRepository: jest.fn((target: any) => {
                    if (target === AgentOpencodeTurn) return turnRepository;
                    return chatRecords;
                }),
            },
        };
        return {
            turnRepository,
            service: new AgentChatRecordService(
                chatRecords as any,
                {} as any,
                {} as any,
                {} as any,
                {} as any,
            ),
        };
    }

    it("joins at most one active turn onto every BuildingAI conversation", async () => {
        const test = harness([
            {
                id: "turn-a",
                conversationId: "conversation-a",
                status: "running",
                lastActivityAt: new Date("2026-08-20T10:00:00.000Z"),
                cancelRequestedAt: null,
            },
        ]);

        await expect(
            test.service.withActiveOpencodeTurnSummaries([
                { id: "conversation-a" } as any,
                { id: "conversation-b" } as any,
            ]),
        ).resolves.toEqual([
            expect.objectContaining({
                id: "conversation-a",
                activeTurn: expect.objectContaining({ turnId: "turn-a", status: "running" }),
            }),
            expect.objectContaining({ id: "conversation-b", activeTurn: null }),
        ]);
    });

    it("queries active lifecycle states only so terminal conversations expose no summary", async () => {
        const test = harness([]);

        await expect(
            test.service.getActiveOpencodeTurnSummary("conversation-terminal"),
        ).resolves.toBeNull();
        expect(test.turnRepository.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ conversationId: "conversation-terminal" }),
            }),
        );
    });
});
