jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("@buildingai/core/modules", () => ({
    AppBillingService: class AppBillingService {},
}));
jest.mock("uuid", () => ({ validate: () => true }));

import { AgentChatMessage, AgentChatRecord } from "@buildingai/db/entities";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { AgentChatMessageService } from "./agent-chat-message.service";
import { AgentChatRecordService } from "./agent-chat-record.service";

describe("durable OpenCode transaction support", () => {
    it("generates deduction account numbers through the supplied transaction manager", () => {
        const source = readFileSync(
            resolve(__dirname, "../../../../../../core/src/modules/billing/base-billing.service.ts"),
            "utf8",
        );
        const deductionBlock = source.slice(
            source.indexOf("async deductUserPower("),
            source.indexOf("async addUserPower("),
        );
        expect(deductionBlock).toMatch(
            /accountNo:\s*await generateNo\(\s*manager\.getRepository\(AccountLog\)/,
        );
        expect(deductionBlock).not.toMatch(
            /accountNo:\s*await generateNo\(this\.accountLogRepository/,
        );
    });

    it("uses the supplied manager repository for every message statistics query", async () => {
        const defaultRepository = {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        const managerRepository = {
            count: jest.fn(async () => 2),
            createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn(async () => ({ totalTokens: "12", totalPower: "3" })),
            })),
        };
        const manager = { getRepository: jest.fn(() => managerRepository) } as any;
        const service = new AgentChatMessageService(defaultRepository as any, {} as any);

        await expect(service.getMessageStats("conversation", manager)).resolves.toEqual({
            messageCount: 2,
            totalTokens: 12,
            totalPower: 3,
        });
        expect(manager.getRepository).toHaveBeenCalledWith(AgentChatMessage);
        expect(defaultRepository.count).not.toHaveBeenCalled();
        expect(defaultRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("uses the supplied manager for statistics update and propagates failures", async () => {
        const messageService = {
            getMessageStats: jest.fn(async () => ({
                messageCount: 2,
                totalTokens: 12,
                totalPower: 3,
            })),
        };
        const service = new AgentChatRecordService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            messageService as any,
        );
        const manager = { update: jest.fn(async () => ({ affected: 1 })) } as any;

        await service.updateStats("conversation", manager);
        expect(messageService.getMessageStats).toHaveBeenCalledWith("conversation", manager);
        expect(manager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation" },
            { messageCount: 2, totalTokens: 12, consumedPower: 3 },
        );

        manager.update.mockRejectedValue(new Error("stats failed"));
        await expect(service.updateStats("conversation", manager)).rejects.toThrow("stats failed");
    });

    it("passes one supplied manager and turn-scoped association to billing", async () => {
        const appBilling = { deductUserPower: jest.fn(async () => undefined) };
        const handler = new AgentBillingHandler(appBilling as any);
        const manager = {} as any;

        await expect(
            handler.deduct(
                {
                    userId: "user",
                    conversationId: "conversation",
                    agentId: "agent",
                    usage: { totalTokens: 1000 },
                    billingRule: { power: 2, tokens: 1000 },
                    associationNo: "opencode-turn:turn-id",
                },
                manager,
            ),
        ).resolves.toBe(2);
        expect(appBilling.deductUserPower).toHaveBeenCalledWith(
            expect.objectContaining({ associationNo: "opencode-turn:turn-id" }),
            manager,
        );
    });
});
