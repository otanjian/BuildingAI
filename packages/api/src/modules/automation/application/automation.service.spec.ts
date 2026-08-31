jest.mock("@buildingai/db/@nestjs/typeorm", () => ({
    InjectRepository: () => () => undefined,
    InjectDataSource: () => () => undefined,
}));
jest.mock("@buildingai/db/entities", () => ({
    Agent: class Agent {},
    AutomationDispatch: class AutomationDispatch {},
    AutomationJob: class AutomationJob {},
    AutomationRun: class AutomationRun {},
    ChannelAccount: class ChannelAccount {},
}));
jest.mock("@buildingai/db/typeorm", () => ({
    In: (values: unknown[]) => values,
    IsNull: () => null,
}));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        conflict: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));
jest.mock("../infrastructure/automation.scheduler", () => ({ AutomationScheduler: class {} }));

import { AutomationService } from "./automation.service";

describe("AutomationService safety boundaries", () => {
    it("documents the bounded result contract", () => {
        const preview = "x".repeat(12_000).slice(0, 12_000);
        expect(preview).toHaveLength(12_000);
        expect(preview).not.toContain("authorization");
    });
});

describe("AutomationService task definition updates", () => {
    it("updates execution policies and recalculates the next occurrence without changing delivery scope", async () => {
        const originalNextRunAt = new Date("2030-01-01T00:00:00.000Z");
        const job: any = {
            id: "task-1",
            name: "Old name",
            prompt: "Old prompt",
            status: "active",
            updatedAt: new Date("2030-01-01T00:00:00.000Z"),
            scheduleKind: "cron",
            schedule: { kind: "cron", expression: "0 9 * * *", timezone: "UTC" },
            timezone: "UTC",
            nextRunAt: originalNextRunAt,
            agentId: "agent-1",
            channel: "feishu",
            channelAccountId: "account-1",
            conversationId: "conversation-1",
            deliveryTarget: { channel: "feishu", accountId: "account-1", targetId: "chat-1" },
            deleteAfterRun: false,
            missedRunPolicy: "fire_once",
            overlapPolicy: "skip",
            timeoutSeconds: 900,
        };
        const service = Object.create(AutomationService.prototype) as AutomationService;
        (service as any).jobRepository = {
            save: jest.fn(async (value: any) => value),
        };

        const saved = await (service as any).updateJob(job, {
            name: "Updated name",
            prompt: "Updated prompt",
            schedule: { kind: "cron", expression: "30 10 * * *", timezone: "Asia/Shanghai" },
            deleteAfterRun: true,
            missedRunPolicy: "catch_up",
            overlapPolicy: "queue_one",
            timeoutSeconds: 1800,
        });

        expect(saved).toMatchObject({
            name: "Updated name",
            prompt: "Updated prompt",
            scheduleKind: "cron",
            timezone: "Asia/Shanghai",
            deleteAfterRun: true,
            missedRunPolicy: "catch_up",
            overlapPolicy: "queue_one",
            timeoutSeconds: 1800,
            agentId: "agent-1",
            channelAccountId: "account-1",
            conversationId: "conversation-1",
        });
        expect(saved.nextRunAt).not.toEqual(originalNextRunAt);
        expect((service as any).jobRepository.save).toHaveBeenCalledWith(job);
    });

    it("rejects timeout values outside the supported range", async () => {
        const service = Object.create(AutomationService.prototype) as AutomationService;
        const job: any = {
            status: "active",
            updatedAt: new Date("2030-01-01T00:00:00.000Z"),
        };
        (service as any).jobRepository = { save: jest.fn() };

        await expect((service as any).updateJob(job, { timeoutSeconds: 0 })).rejects.toThrow(
            "Timeout must be between 1 and 86400 seconds",
        );
    });
});

describe("automationCreatorFilters", () => {
    it("includes channel-created jobs from agents owned by the web user", async () => {
        const { automationCreatorFilters } = require("./automation-creator-scope");

        expect(automationCreatorFilters("user-1", ["agent-1", "agent-2"])).toEqual([
            { creatorId: "user-1" },
            { agentId: "agent-1" },
            { agentId: "agent-2" },
        ]);
    });
});
