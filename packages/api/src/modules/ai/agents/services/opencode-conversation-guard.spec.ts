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

describe("OpenCode conversation mutation guard", () => {
    function service(activeTurn: Record<string, unknown> | null) {
        const chatRecords = {
            update: jest.fn(async () => ({ affected: 1 })),
            manager: {
                getRepository: jest.fn((target: any) => {
                    if (target === AgentOpencodeTurn) {
                        return { findOne: jest.fn(async () => activeTurn) };
                    }
                    return chatRecords;
                }),
            },
        };
        return {
            chatRecords,
            instance: new AgentChatRecordService(
                chatRecords as any,
                {} as any,
                {} as any,
                {} as any,
                {} as any,
            ),
        };
    }

    it("rejects destructive deletion while an exact durable turn is active", async () => {
        const test = service({ id: "active-turn", status: "running" });
        await expect(test.instance.softDelete("conversation", "user")).rejects.toThrow(
            /active.*turn/i,
        );
        expect(test.chatRecords.update).not.toHaveBeenCalled();
    });

    it("allows deletion after all durable turns are terminal", async () => {
        const test = service(null);
        await expect(test.instance.softDelete("conversation", "user")).resolves.toBeUndefined();
        expect(test.chatRecords.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: "conversation", userId: "user" }),
            { isDeleted: true },
        );
    });

    it("keeps archive as a visibility-only update even when a turn is active", async () => {
        const test = service({ id: "active-turn", status: "running" });
        await expect(test.instance.archive("conversation", "user", true)).resolves.toBeUndefined();
        expect(test.chatRecords.update).toHaveBeenCalledWith(
            expect.objectContaining({ id: "conversation", userId: "user" }),
            { archivedAt: expect.any(Date) },
        );
    });
});
