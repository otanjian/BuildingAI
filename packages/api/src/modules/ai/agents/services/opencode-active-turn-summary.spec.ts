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
            save: jest.fn(),
            update: jest.fn(),
            manager: {
                getRepository: jest.fn((target: any) => {
                    if (target === AgentOpencodeTurn) return turnRepository;
                    return chatRecords;
                }),
            },
        };
        return {
            chatRecords,
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

    it("joins at most one active turn and computes legacy running status without metadata writes", async () => {
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
                {
                    id: "conversation-a",
                    metadata: { provider: "opencode", opencodeTurnStatus: "completed" },
                } as any,
                { id: "conversation-b" } as any,
            ]),
        ).resolves.toEqual([
            expect.objectContaining({
                id: "conversation-a",
                activeTurn: expect.objectContaining({ turnId: "turn-a", status: "running" }),
                metadata: expect.objectContaining({ opencodeTurnStatus: "running" }),
            }),
            expect.objectContaining({ id: "conversation-b", activeTurn: null }),
        ]);
        expect(test.chatRecords.save).not.toHaveBeenCalled();
        expect(test.chatRecords.update).not.toHaveBeenCalled();
    });

    it.each([
        ["completed", null, "completed"],
        ["cancelled", null, "aborted"],
        ["failed", "OPENCODE_INACTIVITY_TIMEOUT", "timed_out"],
        ["failed", "OPENCODE_REMOTE_ERROR", "completed"],
    ])(
        "projects terminal %s turns as legacy %s status with no active summary",
        async (status, errorCode, legacyStatus) => {
            const test = harness([
                {
                    id: "turn-terminal",
                    conversationId: "conversation-terminal",
                    status,
                    errorCode,
                    createdAt: new Date("2026-08-20T10:00:00.000Z"),
                },
            ]);

            await expect(
                test.service.getOpencodeTurnConversationProjection("conversation-terminal"),
            ).resolves.toEqual({ activeTurn: null, legacyStatus });
            expect(test.chatRecords.save).not.toHaveBeenCalled();
            expect(test.chatRecords.update).not.toHaveBeenCalled();
        },
    );
});
